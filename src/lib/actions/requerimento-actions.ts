"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/require-role";
import { descartarArquivo, receberArquivo } from "@/lib/upload-direto";
import { DOC_LABEL, DOC_ORDER } from "@/lib/status";
import { notificarEtapa } from "@/lib/notificacoes";
import { registrarArquivo } from "@/lib/arquivos";

// As ações da solicitação são do responsável técnico do lote; o proprietário só acompanha.
async function loadOwnedSolicitacao(session: Awaited<ReturnType<typeof requireRole>>, solicitacaoId: string) {
  const sol = await prisma.solicitacao.findUniqueOrThrow({ where: { id: solicitacaoId }, include: { lote: true } });
  if (sol.lote.rtId !== session.user.id) throw new Error("Solicitação não pertence a este usuário.");
  return sol;
}

export type ReenvioState = { error?: string } | null;

export async function reenviarComplementacaoAction(solicitacaoId: string): Promise<ReenvioState> {
  const session = await requireRole("RESPONSAVEL_TECNICO");
  const sol = await loadOwnedSolicitacao(session, solicitacaoId);
  if (sol.status !== "COMPLEMENTO") return { error: "Esta solicitação não está aguardando complementação." };

  // Sem isto a devolução voltava à CAPE com obrigatório faltando — a validação documental
  // não fecha nunca e o check-list fica travado (caso do SOL-2026-004, DWG que não subiu).
  const documentos = await prisma.solicitacaoDocumento.findMany({ where: { solicitacaoId: sol.id } });
  const faltando = DOC_ORDER.filter((t) => !documentos.some((d) => d.tipo === t));
  if (faltando.length > 0) {
    return { error: `Envie antes os documentos obrigatórios que faltam: ${faltando.map((t) => DOC_LABEL[t].nome).join(", ")}.` };
  }

  // Devolvida é para corrigir: reenviar sem trocar nenhum arquivo só devolveria à CAPE o
  // mesmo material. Pelo menos um documento precisa ter sido enviado depois da devolução.
  const devolucao = await prisma.historicoEvento.findFirst({
    where: { solicitacaoId: sol.id, tipo: { in: ["DOCUMENTACAO_DEVOLVIDA", "CHECKLIST_DEVOLVIDO"] } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (devolucao && !documentos.some((d) => d.uploadedAt > devolucao.createdAt)) {
    return { error: "Substitua pelo menos um dos arquivos apontados pela CAPE antes de enviar a complementação." };
  }

  // Conta aqui, quando a documentação nova chega de fato — contar na devolução fazia
  // cada clique do analista consumir uma tentativa. E só conta o ciclo do check-list:
  // devolução na conferência documental é acerto de forma, não reanálise técnica.
  const emp = await prisma.empreendimento.findUniqueOrThrow({ where: { id: sol.lote.empreendimentoId } });
  const conta = sol.devolvidaNoChecklist;
  const reenvios = conta ? sol.reenvios + 1 : sol.reenvios;

  // Os documentos substituídos já ficaram como não validados no próprio upload, e os
  // demais seguem com a validação que o analista deu. Invalidar todo mundo aqui obrigava
  // a CAPE a reconferir arquivos intactos a cada rodada.
  // OUTROS não entra na conferência documental (não é obrigatório e não tem checkbox de
  // validação), então não pode impedir `documentacaoValidada` de fechar.
  const todosValidados = DOC_ORDER.every((t) => documentos.find((d) => d.tipo === t)?.validado);

  await prisma.$transaction([
    prisma.solicitacao.update({
      where: { id: sol.id },
      data: {
        status: "ENVIADA",
        documentacaoValidada: todosValidados,
        // Documentação já toda validada (devolução do check-list sem documento
        // invalidado): o prazo da nova rodada corre a partir do reenvio.
        prazoInicioEm: todosValidados ? new Date() : null,
        devolvidaNoChecklist: false,
        reenvios,
        pago: conta && reenvios > emp.reenviosSemTaxa ? false : sol.pago,
      },
    }),
    prisma.historicoEvento.create({
      data: {
        solicitacaoId: sol.id,
        tipo: "REENVIO_RECEBIDO",
        texto: (() => {
          const trocados = DOC_ORDER.filter((t) => !documentos.find((d) => d.tipo === t)?.validado).length;
          const oQue = trocados === 0 ? "sem troca de arquivos" : `${trocados} documento(s) a reanalisar`;
          return conta
            ? `Reenvio ${reenvios} de ${emp.reenviosSemTaxa} recebido — ${oQue}.`
            : `Documentação complementada recebida — ${oQue}.`;
        })(),
        cor: "#A89F9F",
        autorId: session.user.id,
      },
    }),
  ]);
  await notificarEtapa(sol.id, { tipo: "COMPLEMENTACAO_RECEBIDA" });

  revalidatePath("/requerimentos");
  revalidatePath("/fila");
  revalidatePath(`/analise/${sol.protocolo}`);
  return null;
}

// O alvará é documento da Prefeitura: o RT anexa, mas quem libera o início da obra é a
// CAPE, depois de conferir. Junto vai a ART/RRT de execução atual e válida — é ela que
// identifica quem responde pela obra a partir daqui.
export async function enviarAlvaraAction(solicitacaoId: string, _prev: unknown, formData: FormData) {
  const session = await requireRole("RESPONSAVEL_TECNICO");
  const sol = await loadOwnedSolicitacao(session, solicitacaoId);
  // Os dois PDFs já subiram direto ao Blob (upload-cliente.ts); qualquer recusa os apaga.
  const alvaraPath = String(formData.get("pathname") ?? "");
  const artPath = String(formData.get("artPathname") ?? "");
  const recusar = async (error: string) => {
    await Promise.all([alvaraPath, artPath].filter(Boolean).map(descartarArquivo));
    return { error };
  };
  if (sol.status !== "RESSALVAS" && sol.status !== "APROVADA") return recusar("Esta solicitação não está aguardando o alvará.");
  if (!alvaraPath) return recusar("Anexe o alvará de execução.");
  if (!artPath) return recusar("Anexe a ART/RRT de execução atual e válida.");

  const destino = { destino: "alvara", solicitacaoId: sol.id } as const;
  const alvaraNome = String(formData.get("nomeArquivo") ?? "").slice(0, 255);
  const artNome = String(formData.get("artNomeArquivo") ?? "").slice(0, 255);
  const [alvara, art] = await Promise.all([receberArquivo(alvaraPath, alvaraNome, destino), receberArquivo(artPath, artNome, destino)]);
  if ("erro" in alvara) return recusar(`Alvará: ${alvara.erro}`);
  if ("erro" in art) return recusar(`ART/RRT de execução: ${art.erro}`);
  const saved = { nomeArquivo: alvaraNome, caminhoArquivo: alvaraPath, tamanhoBytes: alvara.tamanho };

  try {
    await prisma.$transaction([
      // Condicionado ao status: um segundo envio simultâneo não passa.
      prisma.solicitacao.update({
        where: { id: sol.id, status: { in: ["APROVADA", "RESSALVAS"] } },
        data: {
          status: "ALVARA_CONFERENCIA",
          statusAntesAlvara: sol.status,
          alvaraNome: saved.nomeArquivo,
          alvaraCaminho: saved.caminhoArquivo,
          alvaraTamanho: saved.tamanhoBytes,
          alvaraArtNome: artNome,
          alvaraArtCaminho: artPath,
          alvaraArtTamanho: art.tamanho,
          alvaraEnviadoEm: new Date(),
          alvaraRecusa: null,
        },
      }),
      registrarArquivo({
        caminho: artPath,
        nome: artNome,
        tamanho: art.tamanho,
        hash: String(formData.get("artHash") ?? ""),
        categoria: "ART_EXECUCAO",
        solicitacaoId: sol.id,
        empreendimentoId: sol.lote.empreendimentoId,
        enviadoPorId: session.user.id,
      }),
      registrarArquivo({
        caminho: saved.caminhoArquivo,
        nome: saved.nomeArquivo,
        tamanho: saved.tamanhoBytes,
        hash: String(formData.get("hash") ?? ""),
        categoria: "ALVARA",
        solicitacaoId: sol.id,
        empreendimentoId: sol.lote.empreendimentoId,
        enviadoPorId: session.user.id,
      }),
      prisma.historicoEvento.create({
        data: {
          solicitacaoId: sol.id,
          tipo: "ALVARA_ENVIADO",
          texto: "Alvará de execução e ART/RRT de execução enviados. Aguardando conferência da CAPE para liberar o início da obra.",
          cor: "#4B3A7A",
          autorId: session.user.id,
        },
      }),
    ]);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return recusar("O alvará desta solicitação já foi enviado.");
    throw e;
  }
  await notificarEtapa(sol.id, { tipo: "ALVARA_ENVIADO" });

  revalidatePath("/requerimentos");
  revalidatePath("/fila");
  revalidatePath(`/analise/${sol.protocolo}`);
  return { error: undefined };
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { COM_REGRAS } from "@/lib/queries/regras-documentos";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/require-role";
import { descartarArquivo, receberArquivo } from "@/lib/upload-direto";
import { docsObrigatorios, infoDoc } from "@/lib/status";
import { notificarEtapa } from "@/lib/notificacoes";
import { registrarArquivo } from "@/lib/arquivos";
import { rtExecucaoSchema } from "@/lib/rt-execucao";

// As ações da solicitação são do responsável técnico do lote; o proprietário só acompanha.
async function loadOwnedSolicitacao(session: Awaited<ReturnType<typeof requireRole>>, solicitacaoId: string) {
  const sol = await prisma.solicitacao.findUniqueOrThrow({
    where: { id: solicitacaoId },
    include: { lote: { include: { empreendimento: COM_REGRAS } }, lotesAdicionais: { select: { id: true } } },
  });
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
  const obrigatorios = docsObrigatorios(sol.lotesAdicionais.length, sol.lote.empreendimento);
  const faltando = obrigatorios.filter((t) => !documentos.some((d) => d.chave === t));
  if (faltando.length > 0) {
    return { error: `Envie antes os documentos obrigatórios que faltam: ${faltando.map((t) => infoDoc(t, sol.lote.empreendimento).nome).join(", ")}.` };
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
  const todosValidados = obrigatorios.every((t) => documentos.find((d) => d.chave === t)?.validado);

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
          const trocados = obrigatorios.filter((t) => !documentos.find((d) => d.chave === t)?.validado).length;
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
// CAPE, depois de conferir. Junto vão o projeto carimbado pela Prefeitura e a ART/RRT de
// execução atual e válida — é ela que identifica quem responde pela obra a partir daqui.
export async function enviarAlvaraAction(solicitacaoId: string, _prev: unknown, formData: FormData) {
  const session = await requireRole("RESPONSAVEL_TECNICO");
  const sol = await loadOwnedSolicitacao(session, solicitacaoId);
  // Os três PDFs já subiram direto ao Blob (upload-cliente.ts); qualquer recusa os apaga.
  const alvaraPath = String(formData.get("pathname") ?? "");
  const artPath = String(formData.get("artPathname") ?? "");
  const projetoPath = String(formData.get("projetoPathname") ?? "");
  const recusar = async (error: string) => {
    await Promise.all([alvaraPath, artPath, projetoPath].filter(Boolean).map(descartarArquivo));
    return { error };
  };
  if (sol.status !== "RESSALVAS" && sol.status !== "APROVADA") return recusar("Esta solicitação não está aguardando o alvará.");
  // Profissional da execução que não estava contratado no protocolo: é informado aqui.
  const rtExec = sol.rtExecucaoNaLiberacao ? rtExecucaoSchema.safeParse(Object.fromEntries(formData.entries())) : null;
  if (rtExec && !rtExec.success) return recusar(rtExec.error.issues[0]?.message ?? "Informe o responsável técnico pela execução.");
  if (!alvaraPath) return recusar("Anexe o alvará de execução.");
  if (!projetoPath) return recusar("Anexe o projeto carimbado pela Prefeitura.");
  if (!artPath) return recusar("Anexe a ART/RRT de execução atual e válida.");

  const destino = { destino: "alvara", solicitacaoId: sol.id } as const;
  const alvaraNome = String(formData.get("nomeArquivo") ?? "").slice(0, 255);
  const artNome = String(formData.get("artNomeArquivo") ?? "").slice(0, 255);
  const projetoNome = String(formData.get("projetoNomeArquivo") ?? "").slice(0, 255);
  const [alvara, art, projeto] = await Promise.all([
    receberArquivo(alvaraPath, alvaraNome, destino),
    receberArquivo(artPath, artNome, destino),
    receberArquivo(projetoPath, projetoNome, destino),
  ]);
  if ("erro" in alvara) return recusar(`Alvará: ${alvara.erro}`);
  if ("erro" in projeto) return recusar(`Projeto carimbado: ${projeto.erro}`);
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
          ...(rtExec && {
            rtExecucaoNome: rtExec.data.rtExecNome,
            rtExecucaoRegistro: rtExec.data.rtExecRegistro,
            rtExecucaoEmail: rtExec.data.rtExecEmail,
          }),
          alvaraNome: saved.nomeArquivo,
          alvaraCaminho: saved.caminhoArquivo,
          alvaraTamanho: saved.tamanhoBytes,
          alvaraArtNome: artNome,
          alvaraArtCaminho: artPath,
          alvaraArtTamanho: art.tamanho,
          alvaraProjetoNome: projetoNome,
          alvaraProjetoCaminho: projetoPath,
          alvaraProjetoTamanho: projeto.tamanho,
          alvaraEnviadoEm: new Date(),
          alvaraRecusa: null,
        },
      }),
      registrarArquivo({
        caminho: projetoPath,
        nome: projetoNome,
        tamanho: projeto.tamanho,
        hash: String(formData.get("projetoHash") ?? ""),
        categoria: "PROJETO_PREFEITURA",
        solicitacaoId: sol.id,
        empreendimentoId: sol.lote.empreendimentoId,
        enviadoPorId: session.user.id,
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
          texto: `Alvará de execução, projeto carimbado pela Prefeitura e ART/RRT de execução enviados.${rtExec ? ` Responsável técnico pela execução: ${rtExec.data.rtExecNome} · ${rtExec.data.rtExecRegistro}.` : ""} Aguardando conferência da CAPE para liberar o início da obra.`,
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

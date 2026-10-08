"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { descartarArquivo, lerArquivoEnviado } from "@/lib/upload-direto";
import { extensaoDe } from "@/lib/upload-documento";
import { DOC_LABEL, DOC_ORDER } from "@/lib/status";

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

  revalidatePath("/requerimentos");
  revalidatePath("/fila");
  revalidatePath(`/analise/${sol.protocolo}`);
  return null;
}

const MAX_ALVARA_BYTES = 5 * 1024 * 1024;

// O alvará é documento da Prefeitura: o proprietário anexa, mas quem libera o início da
// obra é a CAPE, depois de conferir. Antes disto o clique do proprietário já colocava a
// obra em execução sozinho.
export async function enviarAlvaraAction(solicitacaoId: string, _prev: unknown, formData: FormData) {
  const session = await requireRole("RESPONSAVEL_TECNICO");
  const sol = await loadOwnedSolicitacao(session, solicitacaoId);
  if (sol.status !== "RESSALVAS" && sol.status !== "APROVADA") {
    return { error: "Esta solicitação não está aguardando o alvará." };
  }

  // O PDF já subiu direto ao Blob (upload-cliente.ts); aqui é conferido e registrado.
  const pathname = String(formData.get("pathname") ?? "");
  const nomeArquivo = String(formData.get("nomeArquivo") ?? "").slice(0, 255);
  const arq = pathname && nomeArquivo ? await lerArquivoEnviado(pathname, { destino: "alvara", solicitacaoId: sol.id }) : null;
  if (!arq) return { error: "Arquivo do alvará não encontrado. Envie de novo." };
  const PDF = arq.inicio[0] === 0x25 && arq.inicio[1] === 0x50 && arq.inicio[2] === 0x44 && arq.inicio[3] === 0x46; // %PDF
  if (extensaoDe(nomeArquivo) !== ".pdf" || !PDF || arq.tamanho > MAX_ALVARA_BYTES) {
    await descartarArquivo(pathname);
    return { error: arq.tamanho > MAX_ALVARA_BYTES ? "Arquivo maior que 5 MB." : "Envie o alvará em PDF." };
  }
  const saved = { nomeArquivo, caminhoArquivo: pathname, tamanhoBytes: arq.tamanho };

  await prisma.$transaction([
    prisma.solicitacao.update({
      where: { id: sol.id },
      data: {
        status: "ALVARA_CONFERENCIA",
        statusAntesAlvara: sol.status,
        alvaraNome: saved.nomeArquivo,
        alvaraCaminho: saved.caminhoArquivo,
        alvaraTamanho: saved.tamanhoBytes,
        alvaraEnviadoEm: new Date(),
        alvaraRecusa: null,
      },
    }),
    prisma.historicoEvento.create({
      data: {
        solicitacaoId: sol.id,
        tipo: "ALVARA_ENVIADO",
        texto: "Alvará de execução enviado. Aguardando conferência da CAPE para liberar o início da obra.",
        cor: "#4B3A7A",
        autorId: session.user.id,
      },
    }),
  ]);

  revalidatePath("/requerimentos");
  revalidatePath("/fila");
  revalidatePath(`/analise/${sol.protocolo}`);
  return { error: undefined };
}

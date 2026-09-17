"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { saveUploadedFile } from "@/lib/upload";
import { extensaoDe } from "@/lib/upload-documento";
import { DOC_ORDER } from "@/lib/status";

async function loadOwnedSolicitacao(session: Awaited<ReturnType<typeof requireRole>>, solicitacaoId: string) {
  const sol = await prisma.solicitacao.findUniqueOrThrow({ where: { id: solicitacaoId }, include: { lote: true } });
  const isOwner = sol.lote.proprietarioId === session.user.id || sol.lote.rtId === session.user.id;
  if (!isOwner) throw new Error("Solicitação não pertence a este usuário.");
  return sol;
}

export async function reenviarComplementacaoAction(solicitacaoId: string) {
  const session = await requireRole("PROPRIETARIO", "RESPONSAVEL_TECNICO");
  const sol = await loadOwnedSolicitacao(session, solicitacaoId);
  if (sol.status !== "COMPLEMENTO") return;

  // Conta aqui, quando a documentação nova chega de fato — contar na devolução fazia
  // cada clique do analista consumir uma tentativa. E só conta o ciclo do check-list:
  // devolução na conferência documental é acerto de forma, não reanálise técnica.
  const emp = await prisma.empreendimento.findUniqueOrThrow({ where: { id: sol.lote.empreendimentoId } });
  const conta = sol.devolvidaNoChecklist;
  const reenvios = conta ? sol.reenvios + 1 : sol.reenvios;

  // Os documentos substituídos já ficaram como não validados no próprio upload, e os
  // demais seguem com a validação que o analista deu. Invalidar todo mundo aqui obrigava
  // a CAPE a reconferir arquivos intactos a cada rodada.
  const documentos = await prisma.solicitacaoDocumento.findMany({ where: { solicitacaoId: sol.id } });
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
}

const MAX_ALVARA_BYTES = 5 * 1024 * 1024;

// O alvará é documento da Prefeitura: o proprietário anexa, mas quem libera o início da
// obra é a CAPE, depois de conferir. Antes disto o clique do proprietário já colocava a
// obra em execução sozinho.
export async function enviarAlvaraAction(solicitacaoId: string, _prev: unknown, formData: FormData) {
  const session = await requireRole("PROPRIETARIO", "RESPONSAVEL_TECNICO");
  const sol = await loadOwnedSolicitacao(session, solicitacaoId);
  if (sol.status !== "RESSALVAS" && sol.status !== "APROVADA") {
    return { error: "Esta solicitação não está aguardando o alvará." };
  }

  const file = formData.get("alvara");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione o arquivo do alvará." };
  if (extensaoDe(file.name) !== ".pdf") return { error: "Envie o alvará em PDF." };
  if (file.size > MAX_ALVARA_BYTES) return { error: "Arquivo maior que 5 MB." };

  const saved = await saveUploadedFile(file, `alvaras/${sol.id}`);

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

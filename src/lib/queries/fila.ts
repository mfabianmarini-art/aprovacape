import { prisma } from "@/lib/prisma";
import type { SolicitacaoStatus } from "@/generated/prisma/enums";

// O que a fila de análise não é: rascunho é solicitação que o proprietário ainda está
// montando e que a CAPE nunca recebeu; obra liberada e obra concluída não têm nada a
// analisar — a primeira vive em /obras, a segunda está arquivada.
export const FORA_DA_FILA: SolicitacaoStatus[] = ["RASCUNHO", "EXECUCAO", "CONCLUIDA"];

// Sem filtro por empreendimento: a fila reúne as solicitações de todos os empreendimentos
// que a CAPE atende, com um filtro opcional na tela para restringir a um deles.
export async function getFila() {
  return prisma.solicitacao.findMany({
    where: { status: { notIn: FORA_DA_FILA } },
    orderBy: { createdAt: "desc" },
    include: { lote: { include: { quadra: true, empreendimento: true } } },
  });
}

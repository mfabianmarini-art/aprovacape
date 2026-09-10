import { prisma } from "@/lib/prisma";

// Sem filtro por empreendimento: a fila reúne as solicitações de todos os empreendimentos
// que a CAPE atende, com um filtro opcional na tela para restringir a um deles.
export async function getFila() {
  return prisma.solicitacao.findMany({
    where: { status: { not: "CONCLUIDA" } },
    orderBy: { createdAt: "desc" },
    include: { lote: { include: { quadra: true, empreendimento: true } } },
  });
}

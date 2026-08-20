import { prisma } from "@/lib/prisma";

export async function getMeusRequerimentos(userId: string) {
  return prisma.solicitacao.findMany({
    where: { lote: { OR: [{ proprietarioId: userId }, { rtId: userId }] }, status: { not: "RASCUNHO" } },
    orderBy: { createdAt: "desc" },
    include: {
      lote: { include: { quadra: true } },
      historico: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

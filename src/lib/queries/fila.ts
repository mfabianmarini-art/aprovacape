import { prisma } from "@/lib/prisma";

export async function getFila() {
  return prisma.solicitacao.findMany({
    where: { status: { not: "CONCLUIDA" } },
    orderBy: { createdAt: "desc" },
    include: { lote: { include: { quadra: true } } },
  });
}

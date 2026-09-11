import { prisma } from "@/lib/prisma";

export async function getMeusRequerimentos(userId: string) {
  return prisma.solicitacao.findMany({
    where: { lote: { OR: [{ proprietarioId: userId }, { rtId: userId }] }, status: { not: "RASCUNHO" } },
    orderBy: { createdAt: "desc" },
    include: {
      lote: { include: { quadra: true } },
      historico: { orderBy: { createdAt: "desc" }, take: 1 },
      // Pendências descritas pelo analista: é o que diz ao proprietário/RT o que corrigir.
      documentos: { where: { observacao: { not: null } }, select: { tipo: true, observacao: true } },
      resultados: {
        where: { observacao: { not: null } },
        select: { observacao: true, item: { select: { texto: true, referencia: true } } },
      },
    },
  });
}

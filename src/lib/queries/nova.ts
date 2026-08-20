import { prisma } from "@/lib/prisma";

export async function getMeusLotes(userId: string) {
  return prisma.lote.findMany({
    where: { OR: [{ proprietarioId: userId }, { rtId: userId }] },
    include: { quadra: true, empreendimento: true },
    orderBy: [{ quadra: { nome: "asc" } }, { numero: "asc" }],
  });
}

export async function getRascunho(id: string) {
  return prisma.solicitacao.findUnique({
    where: { id },
    include: { documentos: true, lote: { include: { quadra: true, empreendimento: true } } },
  });
}

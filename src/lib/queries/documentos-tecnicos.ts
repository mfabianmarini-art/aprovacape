import { prisma } from "@/lib/prisma";

export async function getDocumentosTecnicos(empreendimentoId: string) {
  return prisma.documentoTecnico.findMany({
    where: { empreendimentoId },
    orderBy: { createdAt: "desc" },
    include: { enviadoPor: { select: { name: true, role: true } } },
  });
}

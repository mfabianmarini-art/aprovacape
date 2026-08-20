import { prisma } from "@/lib/prisma";

export async function getUsuarios() {
  return prisma.user.findMany({
    where: { vinculoStatus: { not: "PENDENTE" } },
    orderBy: { name: "asc" },
    include: {
      lotesComoProprietario: { include: { quadra: true, empreendimento: true } },
      lotesComoRT: { include: { quadra: true, empreendimento: true } },
    },
  });
}

export async function getVinculosPendentes() {
  return prisma.user.findMany({
    where: { vinculoStatus: "PENDENTE" },
    orderBy: { createdAt: "asc" },
    include: { vinculoLote: { include: { quadra: true, empreendimento: true } } },
  });
}

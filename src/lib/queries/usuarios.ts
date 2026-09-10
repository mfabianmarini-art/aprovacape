import { prisma } from "@/lib/prisma";

// Equipe CAPE atende todos os empreendimentos, então vive fora do escopo de um deles.
export async function getEquipeCape() {
  return prisma.user.findMany({
    where: { role: { in: ["ADMIN_CAPE", "CAPE_ANALISTA"] } },
    orderBy: { name: "asc" },
  });
}

// Quem está ligado a este empreendimento: o síndico e os proprietários/RTs com lote aqui.
// Auto-cadastro pendente não aparece: o lote só é atribuído quando a CAPE aprova o vínculo.
export async function getUsuariosDoEmpreendimento(empreendimentoId: string) {
  return prisma.user.findMany({
    where: {
      OR: [
        { empreendimentosSindico: { some: { id: empreendimentoId } } },
        { lotesComoProprietario: { some: { empreendimentoId } } },
        { lotesComoRT: { some: { empreendimentoId } } },
      ],
    },
    orderBy: { name: "asc" },
    include: {
      lotesComoProprietario: { where: { empreendimentoId }, include: { quadra: true } },
      lotesComoRT: { where: { empreendimentoId }, include: { quadra: true } },
    },
  });
}

export async function getVinculosPendentesDoEmpreendimento(empreendimentoId: string) {
  return prisma.user.findMany({
    where: { vinculoStatus: "PENDENTE", vinculoLote: { empreendimentoId } },
    orderBy: { createdAt: "asc" },
    include: { vinculoLote: { include: { quadra: true } } },
  });
}

// Síndicos já cadastrados, para vincular um existente a este empreendimento.
export async function getSindicos() {
  return prisma.user.findMany({
    where: { role: "SINDICO" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}

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

// Fila de vínculos de todos os empreendimentos, para a tela própria da equipe CAPE.
export async function getVinculosPendentes() {
  return prisma.user.findMany({
    where: { vinculoStatus: "PENDENTE" },
    // Data do pedido, não da conta: usuário já cadastrado também pede vínculo por aqui.
    orderBy: [{ vinculoSolicitadoEm: "asc" }, { createdAt: "asc" }],
    include: {
      vinculoLote: {
        include: {
          quadra: true,
          empreendimento: true,
          // Quem já ocupa o lote: aprovar substitui, e o analista precisa ver isso antes.
          proprietario: { select: { name: true, cpf: true } },
          rt: { select: { name: true } },
        },
      },
      lotesComoProprietario: { include: { quadra: true, empreendimento: { select: { nome: true } } } },
      lotesComoRT: { include: { quadra: true, empreendimento: { select: { nome: true } } } },
    },
  });
}

// A análise acontece na tela /vinculos; aqui só o aviso de que há pedidos deste empreendimento.
export async function countVinculosPendentesDoEmpreendimento(empreendimentoId: string) {
  return prisma.user.count({ where: { vinculoStatus: "PENDENTE", vinculoLote: { empreendimentoId } } });
}

// Síndicos já cadastrados, para vincular um existente a este empreendimento.
export async function getSindicos() {
  return prisma.user.findMany({
    where: { role: "SINDICO" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}

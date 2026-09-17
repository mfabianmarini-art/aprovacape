import { prisma } from "@/lib/prisma";

// Árvore empreendimento → quadra → lote para o seletor de vínculo, usado no auto-cadastro
// (/login) e no pedido de novo vínculo de quem já tem conta (/vinculo).
export async function getEmpreendimentosParaVinculo() {
  return prisma.empreendimento.findMany({
    select: {
      id: true,
      nome: true,
      cidade: true,
      uf: true,
      quadras: {
        select: {
          id: true,
          nome: true,
          lotes: { select: { id: true, numero: true }, orderBy: { numero: "asc" } },
        },
        orderBy: { nome: "asc" },
      },
    },
    orderBy: { nome: "asc" },
  });
}

const loteResumo = {
  select: {
    id: true,
    numero: true,
    quadra: { select: { nome: true } },
    empreendimento: { select: { nome: true } },
  },
} as const;

// Pedido de vínculo atual do usuário (há no máximo um por vez) e os lotes já vinculados.
export async function getMeuVinculo(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      vinculoStatus: true,
      vinculoSolicitadoEm: true,
      vinculoRevisadoEm: true,
      vinculoLote: loteResumo,
      lotesComoProprietario: { ...loteResumo, orderBy: [{ quadra: { nome: "asc" } }, { numero: "asc" }] },
      lotesComoRT: { ...loteResumo, orderBy: [{ quadra: { nome: "asc" } }, { numero: "asc" }] },
    },
  });
}

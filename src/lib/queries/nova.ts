import { prisma } from "@/lib/prisma";

// Só o RT abre solicitação, então só os lotes em que ele é o responsável técnico.
export async function getMeusLotes(userId: string) {
  return prisma.lote.findMany({
    where: { rtId: userId },
    include: { quadra: true, empreendimento: true },
    orderBy: [{ quadra: { nome: "asc" } }, { numero: "asc" }],
  });
}

// Rascunhos em andamento do usuário, para ele retomar de onde parou em vez de
// recomeçar — só chegam a /requerimentos depois de enviados.
export async function getMeusRascunhos(userId: string) {
  return prisma.solicitacao.findMany({
    where: {
      status: "RASCUNHO",
      lote: { rtId: userId },
    },
    orderBy: { createdAt: "desc" },
    include: { documentos: { select: { tipo: true } }, lote: { include: { quadra: true, empreendimento: true } } },
  });
}

export async function getRascunho(id: string) {
  return prisma.solicitacao.findUnique({
    where: { id },
    include: { documentos: true, lote: { include: { quadra: true, empreendimento: true } } },
  });
}

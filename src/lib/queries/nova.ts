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

// Sugestão para o e-mail do proprietário no envio: o último protocolo do lote que já tinha
// e-mail, ou o que o RT declarou ao pedir o vínculo deste lote. O RT pode trocar.
export async function emailProprietarioDeclarado(userId: string, loteId: string) {
  const [anterior, user] = await Promise.all([
    prisma.solicitacao.findFirst({
      where: { loteId, proprietarioEmail: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { proprietarioEmail: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { vinculoLoteId: true, vinculoPropEmail: true } }),
  ]);
  return anterior?.proprietarioEmail ?? (user?.vinculoLoteId === loteId ? (user.vinculoPropEmail ?? "") : "");
}

export async function getRascunho(id: string) {
  return prisma.solicitacao.findUnique({
    where: { id },
    include: { documentos: true, lote: { include: { quadra: true, empreendimento: true } } },
  });
}

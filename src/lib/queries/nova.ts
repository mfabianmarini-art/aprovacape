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

// Sugestão de e-mail do proprietário por lote, no cadastro da obra: o do último protocolo
// do lote que já tinha e-mail, ou o que o RT declarou ao pedir o vínculo. O RT pode trocar.
export async function emailsSugeridosPorLote(userId: string, loteIds: string[]) {
  const [anteriores, user] = await Promise.all([
    prisma.solicitacao.findMany({
      where: { loteId: { in: loteIds }, proprietarioEmail: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { loteId: true, proprietarioEmail: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { vinculoLoteId: true, vinculoPropEmail: true } }),
  ]);
  const sugestoes: Record<string, string> = {};
  if (user?.vinculoLoteId && user.vinculoPropEmail) sugestoes[user.vinculoLoteId] = user.vinculoPropEmail;
  // Do mais antigo ao mais recente, para o último protocolo prevalecer.
  for (const a of [...anteriores].reverse()) sugestoes[a.loteId] = a.proprietarioEmail!;
  return sugestoes;
}

export async function getRascunho(id: string) {
  return prisma.solicitacao.findUnique({
    where: { id },
    include: { documentos: true, lote: { include: { quadra: true, empreendimento: true } } },
  });
}

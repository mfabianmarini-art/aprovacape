import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// O que docsObrigatorios / docsOpcionais precisam do empreendimento.
export const COM_REGRAS = {
  include: { regrasDocumentos: { select: { tipo: true, exigencia: true } } },
} satisfies Prisma.EmpreendimentoDefaultArgs;

export async function getRegrasDocumentos(empreendimentoId: string) {
  return prisma.regraDocumento.findMany({
    where: { empreendimentoId },
    orderBy: { atualizadoEm: "desc" },
    select: { tipo: true, exigencia: true, atualizadoEm: true, atualizadoPor: { select: { name: true } } },
  });
}

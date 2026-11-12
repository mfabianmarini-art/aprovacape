import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const PERSONALIZADOS = {
  orderBy: { createdAt: "asc" },
  select: { id: true, nome: true, descricao: true, extensoes: true, maxMB: true, exigencia: true, excluidoEm: true },
} satisfies Prisma.Empreendimento$documentosPersonalizadosArgs;

// O que docsObrigatorios / docsOpcionais / infoDoc precisam do empreendimento.
export const COM_REGRAS = {
  include: { regrasDocumentos: { select: { tipo: true, exigencia: true } }, documentosPersonalizados: PERSONALIZADOS },
} satisfies Prisma.EmpreendimentoDefaultArgs;

export const SELECT_REGRAS = {
  nome: true,
  regrasDocumentos: { select: { tipo: true, exigencia: true } },
  documentosPersonalizados: PERSONALIZADOS,
} satisfies Prisma.EmpreendimentoSelect;

export async function getRegrasDocumentos(empreendimentoId: string) {
  return prisma.regraDocumento.findMany({
    where: { empreendimentoId },
    orderBy: { atualizadoEm: "desc" },
    select: { tipo: true, exigencia: true, atualizadoEm: true, atualizadoPor: { select: { name: true } } },
  });
}

export async function getDocumentosPersonalizados(empreendimentoId: string) {
  return prisma.documentoPersonalizado.findMany({
    where: { empreendimentoId, excluidoEm: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, nome: true, descricao: true, extensoes: true, maxMB: true, exigencia: true, createdAt: true, criadoPor: { select: { name: true } } },
  });
}

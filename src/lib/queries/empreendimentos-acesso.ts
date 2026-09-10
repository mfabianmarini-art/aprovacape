import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

export type EmpreendimentoOpcao = { id: string; nome: string };

// CAPE_ANALISTA/ADMIN_CAPE operam a CAPE inteira e enxergam todos os empreendimentos.
// SINDICO só enxerga o(s) empreendimento(s) ao qual está vinculado como síndico.
// PROPRIETARIO/RESPONSAVEL_TECNICO só enxergam o(s) empreendimento(s) onde têm algum lote.
export async function listEmpreendimentosAcessiveis(userId: string, role: Role): Promise<EmpreendimentoOpcao[]> {
  if (role === "SINDICO") {
    return prisma.empreendimento.findMany({
      where: { sindicoId: userId },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    });
  }
  if (role === "PROPRIETARIO" || role === "RESPONSAVEL_TECNICO") {
    return prisma.empreendimento.findMany({
      where: { lotes: { some: { OR: [{ proprietarioId: userId }, { rtId: userId }] } } },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    });
  }
  return prisma.empreendimento.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } });
}

// Resolve qual empreendimento exibir: o solicitado via query string (?emp=), se acessível,
// senão o primeiro da lista acessível ao usuário.
export async function resolveEmpreendimentoAtual(userId: string, role: Role, solicitado?: string) {
  const opcoes = await listEmpreendimentosAcessiveis(userId, role);
  const atual = (solicitado && opcoes.find((o) => o.id === solicitado)) || opcoes[0] || null;
  return { atual, opcoes };
}

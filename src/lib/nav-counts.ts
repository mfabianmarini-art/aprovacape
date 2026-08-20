import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { SCREENS, type ScreenId } from "@/lib/nav";

export async function getNavCounts(role: Role, userId: string): Promise<Record<ScreenId, string>> {
  const [lotes, fila, meusPedidos, empreendimentos, usuarios] = await Promise.all([
    prisma.lote.count(),
    prisma.solicitacao.count({ where: { status: { not: "CONCLUIDA" } } }),
    prisma.solicitacao.count({
      where: {
        lote: { OR: [{ proprietarioId: userId }, { rtId: userId }] },
        status: { not: "CONCLUIDA" },
      },
    }),
    prisma.empreendimento.count(),
    prisma.user.count(),
  ]);

  return {
    resumo: String(lotes),
    fila: String(fila),
    requerimentos: String(meusPedidos),
    nova: "",
    empreendimentos: String(empreendimentos),
    checklists: String(empreendimentos),
    usuarios: String(usuarios),
  };
}

export function navWithCounts(role: Role, counts: Record<ScreenId, string>) {
  return SCREENS.filter((s) => s.roles.includes(role)).map((s) => ({
    path: s.path,
    label: s.label,
    count: counts[s.id],
  }));
}

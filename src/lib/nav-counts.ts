import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { SCREENS, type ScreenId } from "@/lib/nav";
import { FORA_DA_FILA } from "@/lib/queries/fila";

export async function getNavCounts(role: Role, userId: string): Promise<Record<ScreenId, string>> {
  const [lotes, fila, obras, vinculos, meusPedidos, empreendimentos, equipeCape] = await Promise.all([
    prisma.lote.count(),
    // Mesmo recorte da tela: o número no menu precisa bater com a lista que ela abre.
    prisma.solicitacao.count({ where: { status: { notIn: FORA_DA_FILA } } }),
    prisma.solicitacao.count({ where: { status: "EXECUCAO" } }),
    prisma.user.count({ where: { vinculoStatus: "PENDENTE" } }),
    // Rascunho é solicitação que a pessoa ainda está montando e que nem aparece em
    // /requerimentos: contá-lo marcava o menu com pedidos que a CAPE nunca recebeu.
    prisma.solicitacao.count({
      where: {
        lote: { OR: [{ proprietarioId: userId }, { rtId: userId }] },
        status: { notIn: ["RASCUNHO", "CONCLUIDA"] },
      },
    }),
    prisma.empreendimento.count(),
    prisma.user.count({ where: { role: { in: ["ADMIN_CAPE", "CAPE_ANALISTA"] } } }),
  ]);

  return {
    resumo: String(lotes),
    fila: String(fila),
    obras: String(obras),
    vinculos: String(vinculos),
    requerimentos: String(meusPedidos),
    nova: "",
    empreendimentos: String(empreendimentos),
    usuarios: String(equipeCape),
    documentos: "",
    relatorios: "",
  };
}

export function navWithCounts(role: Role, counts: Record<ScreenId, string>) {
  return SCREENS.filter((s) => s.roles.includes(role)).map((s) => ({
    path: s.path,
    label: s.labelPorPapel?.[role] ?? s.label,
    count: counts[s.id],
    separadorAntes: s.separadorAntes ?? false,
  }));
}

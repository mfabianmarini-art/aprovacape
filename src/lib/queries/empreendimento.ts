import { prisma } from "@/lib/prisma";
import { STATUS_INFO, LIVRE_INFO } from "@/lib/status";

export async function getEmpreendimentoConfig(empreendimentoId: string) {
  const emp = await prisma.empreendimento.findUnique({
    where: { id: empreendimentoId },
    include: {
      sindico: true,
      quadras: {
        orderBy: { nome: "asc" },
        include: {
          lotes: {
            orderBy: { numero: "asc" },
            include: { solicitacoes: { orderBy: { createdAt: "desc" }, take: 1 } },
          },
        },
      },
      categorias: { include: { itens: true } },
    },
  });
  if (!emp) return null;

  const quadrasCfg = emp.quadras.map((q) => ({
    id: q.id,
    nome: q.nome,
    total: q.totalLotes,
    lotes: q.lotes.map((l) => {
      const atual = l.solicitacoes[0];
      const cor = atual ? STATUS_INFO[atual.status].bg : LIVRE_INFO.bg;
      return { id: l.id, numero: l.numero, cor };
    }),
  }));

  const totalItensChecklist = emp.categorias.reduce((a, c) => a + c.itens.length, 0);

  return { empreendimento: emp, quadrasCfg, totalItensChecklist };
}

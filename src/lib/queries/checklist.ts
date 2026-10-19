import { prisma } from "@/lib/prisma";

// Status em que o check-list ainda está sendo aplicado: aí entram os itens vigentes. Depois
// disso a análise está fechada e só interessam os itens que foram de fato decididos.
const EM_ANALISE = new Set(["RASCUNHO", "ENVIADA", "ANALISE", "COMPLEMENTO"]);

// Itens do check-list que valem para uma solicitação. Vigentes (não arquivados) enquanto
// ela está em análise, mais qualquer item — mesmo de um check-list já substituído — sobre
// o qual ela já tem decisão: trocar o check-list do empreendimento não apaga o que foi
// analisado. Única fonte para a tela de análise e para a contagem do parecer.
export async function checklistDaSolicitacao(empreendimentoId: string, solicitacao: { id: string; status: string }) {
  const emAnalise = EM_ANALISE.has(solicitacao.status);
  const categorias = await prisma.checklistCategoria.findMany({
    where: { empreendimentoId },
    // Vigentes primeiro; as de um check-list substituído depois.
    orderBy: [{ arquivadaEm: { sort: "asc", nulls: "first" } }, { ordem: "asc" }],
    include: {
      itens: {
        orderBy: { ordem: "asc" },
        include: { resultados: { where: { solicitacaoId: solicitacao.id }, select: { id: true } } },
      },
    },
  });
  return categorias
    .map(({ itens, ...c }) => ({
      ...c,
      itens: itens.filter((i) => i.resultados.length > 0 || (emAnalise && !c.arquivadaEm && !i.arquivadoEm)),
    }))
    .filter((c) => c.itens.length > 0);
}

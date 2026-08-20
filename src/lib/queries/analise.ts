import { prisma } from "@/lib/prisma";

export async function getAnalise(protocolo: string) {
  const solicitacao = await prisma.solicitacao.findUnique({
    where: { protocolo },
    include: {
      lote: { include: { quadra: true, empreendimento: true, proprietario: true, rt: true } },
      documentos: true,
      resultados: { include: { item: true } },
      historico: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!solicitacao) return null;

  const categorias = await prisma.checklistCategoria.findMany({
    where: { empreendimentoId: solicitacao.lote.empreendimentoId },
    orderBy: { ordem: "asc" },
    include: { itens: { orderBy: { ordem: "asc" } } },
  });

  return { solicitacao, categorias };
}

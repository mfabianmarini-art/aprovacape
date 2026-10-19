import { prisma } from "@/lib/prisma";
import { SELECT_VERSOES_ANTERIORES } from "@/components/VersoesAnteriores";
import { checklistDaSolicitacao } from "@/lib/queries/checklist";

export async function getAnalise(protocolo: string) {
  const solicitacao = await prisma.solicitacao.findUnique({
    where: { protocolo },
    include: {
      lote: { include: { quadra: true, empreendimento: true, proprietario: true, rt: true } },
      documentos: true,
      resultados: { include: { item: true } },
      historico: { orderBy: { createdAt: "desc" } },
      irregularidades: {
        orderBy: { createdAt: "desc" },
        include: { evidencias: true, registradaPor: { select: { name: true } } },
      },
      devolutivas: { orderBy: { createdAt: "desc" }, include: { autor: { select: { name: true } } } },
      arquivos: SELECT_VERSOES_ANTERIORES,
    },
  });
  if (!solicitacao) return null;

  const categorias = await checklistDaSolicitacao(solicitacao.lote.empreendimentoId, solicitacao);

  return { solicitacao, categorias };
}

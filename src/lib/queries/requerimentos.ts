import { prisma } from "@/lib/prisma";

export async function getMeusRequerimentos(userId: string) {
  return prisma.solicitacao.findMany({
    where: { lote: { OR: [{ proprietarioId: userId }, { rtId: userId }] }, status: { not: "RASCUNHO" } },
    orderBy: { createdAt: "desc" },
    include: {
      lote: { include: { quadra: true, empreendimento: true } },
      // Histórico completo: o card minimizado expande para mostrar tanto o andamento da
      // solicitação quanto o da análise, que vivem no mesmo stream de eventos.
      historico: { orderBy: { createdAt: "desc" }, include: { autor: { select: { name: true, role: true } } } },
      // Todos os documentos: os com `observacao` viram a lista de pendências, e em
      // COMPLEMENTO a pessoa precisa da lista inteira para poder substituir qualquer um.
      documentos: { select: { id: true, tipo: true, nomeArquivo: true, observacao: true, validado: true } },
      resultados: {
        where: { observacao: { not: null } },
        select: { observacao: true, item: { select: { texto: true, referencia: true } } },
      },
      irregularidades: {
        orderBy: { createdAt: "desc" },
        include: { evidencias: { select: { id: true, nomeArquivo: true } } },
      },
    },
  });
}

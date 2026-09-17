import { prisma } from "@/lib/prisma";

export async function getMeusRequerimentos(userId: string) {
  return prisma.solicitacao.findMany({
    // Vinculado ao lote hoje, ou autor do protocolo. A segunda metade existe porque o
    // lote guarda um único RT: quando a CAPE aprova a troca de profissional, filtrar só
    // pelo vínculo atual apagaria da tela do RT anterior tudo que ele protocolou,
    // inclusive o que ainda está em análise. Ver é diferente de agir — as ações seguem
    // exigindo vínculo com o lote (loadOwnedSolicitacao).
    where: {
      OR: [{ lote: { OR: [{ proprietarioId: userId }, { rtId: userId }] } }, { criadoPorId: userId }],
      status: { not: "RASCUNHO" },
    },
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

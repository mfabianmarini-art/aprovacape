import { prisma } from "@/lib/prisma";

// Obra aprovada e com início liberado: o alvará já foi aceito pela CAPE e a solicitação
// passou a EXECUCAO. CONCLUIDA fica de fora — obra arquivada não está em andamento.
export async function getObrasEmAndamento() {
  return prisma.solicitacao.findMany({
    where: { status: "EXECUCAO" },
    orderBy: { updatedAt: "desc" },
    include: {
      lote: { include: { quadra: true, empreendimento: { select: { nome: true } } } },
      // Com o relatório e as evidências: a linha resolve o acompanhamento sem abrir a
      // ficha, e regularizar sem reler o que foi apontado seria decidir no escuro.
      irregularidades: {
        orderBy: { createdAt: "desc" },
        include: {
          registradaPor: { select: { name: true } },
          evidencias: { select: { id: true, nomeArquivo: true } },
        },
      },
      // Quando a obra foi liberada é a data em que o alvará foi aceito, não a do envio
      // nem a da aprovação do projeto.
      historico: {
        where: { tipo: "ALVARA_ACEITO" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });
}

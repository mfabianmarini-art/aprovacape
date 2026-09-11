import { prisma } from "@/lib/prisma";

// Obra aprovada e com início liberado: o alvará já foi aceito pela CAPE e a solicitação
// passou a EXECUCAO. CONCLUIDA fica de fora — obra arquivada não está em andamento.
export async function getObrasEmAndamento() {
  return prisma.solicitacao.findMany({
    where: { status: "EXECUCAO" },
    orderBy: { updatedAt: "desc" },
    include: {
      lote: { include: { quadra: true, empreendimento: { select: { nome: true } } } },
      irregularidades: {
        orderBy: { createdAt: "desc" },
        select: { id: true, tipo: true, createdAt: true, regularizadaEm: true },
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

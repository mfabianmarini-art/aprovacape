import { prisma } from "@/lib/prisma";

// Quanto o empreendimento ocupa no armazenamento (inventário, sem os já excluídos).
export async function armazenamentoDoEmpreendimento(empreendimentoId: string) {
  const [todos, versoes] = await Promise.all([
    prisma.arquivo.aggregate({ where: { empreendimentoId, excluidoEm: null }, _count: true, _sum: { tamanho: true } }),
    prisma.arquivo.aggregate({ where: { empreendimentoId, excluidoEm: null, substituidoEm: { not: null } }, _count: true, _sum: { tamanho: true } }),
  ]);
  return { arquivos: todos._count, bytes: todos._sum.tamanho ?? 0, versoes: versoes._count, bytesVersoes: versoes._sum.tamanho ?? 0 };
}

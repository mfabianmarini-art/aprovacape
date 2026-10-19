import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import type { ArquivoCategoria, DocumentoTipo } from "@/generated/prisma/enums";

export type NovoArquivo = {
  caminho: string;
  nome: string;
  tamanho: number;
  categoria: ArquivoCategoria;
  hash?: string | null;
  documentoTipo?: DocumentoTipo;
  solicitacaoId?: string;
  empreendimentoId?: string | null;
  usuarioId?: string;
  enviadoPorId?: string;
};

// Toda gravação de arquivo passa por aqui, na mesma transação do registro de origem: o
// que está no inventário é documentação e nunca é apagado pela limpeza (manutencao.ts).
// Devolve a operação sem executar, para entrar no $transaction de quem chama.
export function registrarArquivo(a: NovoArquivo) {
  const hash = a.hash && /^[0-9a-f]{64}$/.test(a.hash) ? a.hash : null;
  return prisma.arquivo.upsert({ where: { caminho: a.caminho }, create: { ...a, hash }, update: {} });
}

// A versão anterior deixa de ser a vigente. Enquanto a solicitação está em aprovação ela
// continua guardada e acessível (histórico da análise); na liberação da obra é excluída
// (excluirVersoesDaAprovacao).
export function marcarSubstituido(caminho: string | null | undefined) {
  return prisma.arquivo.updateMany({ where: { caminho: caminho ?? "", substituidoEm: null }, data: { substituidoEm: new Date() } });
}

// Status em que a obra já foi liberada (alvará aceito): a documentação que valeu para a
// aprovação está definida.
export const STATUS_OBRA_LIBERADA = ["EXECUCAO", "CONCLUIDA"] as const;

// Regra contratual: só a documentação vigente na liberação da obra é guardada (até 30 dias
// após a rescisão). O que foi recusado ou substituído durante a aprovação — documentos
// trocados, alvarás recusados — é excluído quando a obra é liberada. A linha do inventário
// fica (excluidoEm) como registro do que existiu; o download passa a responder 410.
export async function excluirVersoesDaAprovacao(solicitacaoId: string) {
  const versoes = await prisma.arquivo.findMany({
    where: { solicitacaoId, substituidoEm: { not: null }, excluidoEm: null },
    select: { id: true, caminho: true },
  });
  for (let i = 0; i < versoes.length; i += 100) {
    const lote = versoes.slice(i, i + 100);
    await del(lote.map((v) => v.caminho));
    await prisma.arquivo.updateMany({ where: { id: { in: lote.map((v) => v.id) } }, data: { excluidoEm: new Date() } });
  }
  if (versoes.length) console.log(JSON.stringify({ evento: "versoes_excluidas_na_liberacao", solicitacaoId, quantidade: versoes.length }));
  return versoes.length;
}

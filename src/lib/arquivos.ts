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

// A versão anterior deixa de ser a vigente, mas continua guardada e acessível — por
// contrato, toda a documentação fica disponível ao condomínio.
export function marcarSubstituido(caminho: string | null | undefined) {
  return prisma.arquivo.updateMany({ where: { caminho: caminho ?? "", substituidoEm: null }, data: { substituidoEm: new Date() } });
}

-- Passo 1/2 do check-list de documentos novo: adiciona os novos valores do enum antes
-- de recriar o tipo (Postgres não deixa usar um valor novo na mesma transação em que
-- ele é criado, então a migração de dados fica no próximo arquivo).
ALTER TYPE "DocumentoTipo" ADD VALUE 'ART_RRT_PROJETO';
ALTER TYPE "DocumentoTipo" ADD VALUE 'ART_RRT_EXECUCAO';
ALTER TYPE "DocumentoTipo" ADD VALUE 'PROJETO_PAISAGISTICO';
ALTER TYPE "DocumentoTipo" ADD VALUE 'CAPA_IPTU';
ALTER TYPE "DocumentoTipo" ADD VALUE 'MATRICULA';
ALTER TYPE "DocumentoTipo" ADD VALUE 'LEVANTAMENTO_PLANIALTIMETRICO';
ALTER TYPE "DocumentoTipo" ADD VALUE 'OUTROS';

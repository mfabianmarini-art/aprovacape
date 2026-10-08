-- Projeto arquitetônico passa a ter dois campos: o PDF e o DWG (ou .zip com vários DWG).
-- O check-list técnico ganha "não se aplica" para itens que não cabem na obra.
-- Só os valores novos aqui: a migração de dados que usa PROJETO_ARQUITETONICO_DWG fica no
-- próximo arquivo, porque o Postgres não usa um valor de enum na transação que o criou.
ALTER TYPE "DocumentoTipo" ADD VALUE 'PROJETO_ARQUITETONICO_DWG' AFTER 'PROJETO_ARQUITETONICO';
ALTER TYPE "ChecklistItemStatus" ADD VALUE 'NAO_SE_APLICA';

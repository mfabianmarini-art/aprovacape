-- Passo 2/2: migra documentos já enviados para os novos tipos (ART/RRT vira a do
-- projeto; projeto estrutural, que deixou de ser exigido, vira "outros" para não
-- perder o arquivo) e recria o enum sem os valores antigos.
UPDATE "SolicitacaoDocumento" SET "tipo" = 'ART_RRT_PROJETO' WHERE "tipo" = 'ART_RRT';
UPDATE "SolicitacaoDocumento" SET "tipo" = 'OUTROS' WHERE "tipo" = 'PROJETO_ESTRUTURAL';

ALTER TYPE "DocumentoTipo" RENAME TO "DocumentoTipo_old";

CREATE TYPE "DocumentoTipo" AS ENUM (
  'PROJETO_ARQUITETONICO',
  'ART_RRT_PROJETO',
  'ART_RRT_EXECUCAO',
  'MEMORIAL_DESCRITIVO',
  'PROJETO_PAISAGISTICO',
  'CAPA_IPTU',
  'MATRICULA',
  'LEVANTAMENTO_PLANIALTIMETRICO',
  'OUTROS'
);

ALTER TABLE "SolicitacaoDocumento"
  ALTER COLUMN "tipo" TYPE "DocumentoTipo" USING ("tipo"::text::"DocumentoTipo");

DROP TYPE "DocumentoTipo_old";

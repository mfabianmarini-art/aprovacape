-- A ART/RRT já comprova a habilitação do responsável técnico, então o documento
-- separado deixa de ser exigido. Postgres não remove valor de enum em uso: apaga as
-- linhas desse tipo e recria o tipo sem ele.
DELETE FROM "SolicitacaoDocumento" WHERE "tipo" = 'DOC_RESPONSAVEL_TECNICO';

ALTER TYPE "DocumentoTipo" RENAME TO "DocumentoTipo_old";

CREATE TYPE "DocumentoTipo" AS ENUM ('PROJETO_ARQUITETONICO', 'ART_RRT', 'MEMORIAL_DESCRITIVO', 'PROJETO_ESTRUTURAL');

ALTER TABLE "SolicitacaoDocumento"
  ALTER COLUMN "tipo" TYPE "DocumentoTipo" USING ("tipo"::text::"DocumentoTipo");

DROP TYPE "DocumentoTipo_old";

-- AlterTable
-- Endereço e área do lote deixam de ser preenchidos pelo gestor no cadastro do lote —
-- passam a ser informados pelo proprietário/RT na primeira solicitação de obra do lote.
ALTER TABLE "Lote" ALTER COLUMN "rua" DROP NOT NULL;
ALTER TABLE "Lote" ALTER COLUMN "areaM2" DROP NOT NULL;

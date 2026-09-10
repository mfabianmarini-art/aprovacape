-- CreateEnum
CREATE TYPE "Conselho" AS ENUM ('CREA', 'CAU');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "conselho" "Conselho",
                  ADD COLUMN     "registroNumero" TEXT,
                  ADD COLUMN     "registroUf" TEXT;

-- Os registros existentes eram um texto único ("CREA 5069874/D"): separa conselho e número.
-- A UF nunca foi coletada, então fica nula até a pessoa atualizar o cadastro.
UPDATE "User"
   SET "conselho" = 'CREA',
       "registroNumero" = btrim(substring("creaCau" from 5))
 WHERE "creaCau" ILIKE 'CREA%';

UPDATE "User"
   SET "conselho" = 'CAU',
       "registroNumero" = btrim(substring("creaCau" from 4))
 WHERE "creaCau" ILIKE 'CAU%';

UPDATE "User"
   SET "registroNumero" = btrim("creaCau")
 WHERE "creaCau" IS NOT NULL AND "conselho" IS NULL;

-- DropColumn
ALTER TABLE "User" DROP COLUMN "creaCau";

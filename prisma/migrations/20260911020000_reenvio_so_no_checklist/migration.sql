-- AlterTable
ALTER TABLE "Solicitacao" ADD COLUMN     "devolvidaNoChecklist" BOOLEAN NOT NULL DEFAULT false;

-- Solicitações já devolvidas: só as que passaram da validação documental estavam no
-- ciclo do check-list, e é esse o ciclo que conta reenvio.
UPDATE "Solicitacao"
   SET "devolvidaNoChecklist" = true
 WHERE "status" = 'COMPLEMENTO' AND "documentacaoValidada" = true;

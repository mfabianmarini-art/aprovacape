-- O que a aprovação de um lote adicional fez no RT do lote, para o desvínculo poder desfazer.
ALTER TABLE "SolicitacaoLoteAdicional" ADD COLUMN "rtAlterado" BOOLEAN;
ALTER TABLE "SolicitacaoLoteAdicional" ADD COLUMN "rtAnteriorId" TEXT;

-- AddForeignKey
ALTER TABLE "SolicitacaoLoteAdicional" ADD CONSTRAINT "SolicitacaoLoteAdicional_rtAnteriorId_fkey" FOREIGN KEY ("rtAnteriorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

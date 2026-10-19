-- Prazo de análise em dias úteis a partir da validação documental; ART de execução com o alvará.
-- AlterEnum
ALTER TYPE "ArquivoCategoria" ADD VALUE 'ART_EXECUCAO';

-- AlterTable
ALTER TABLE "Solicitacao" ADD COLUMN     "alvaraArtCaminho" TEXT,
ADD COLUMN     "alvaraArtNome" TEXT,
ADD COLUMN     "alvaraArtTamanho" INTEGER,
ADD COLUMN     "prazoInicioEm" TIMESTAMP(3);


-- Solicitações já com a documentação validada: o prazo passa a contar da última entrada
-- na CAPE (protocolo ou reenvio), a melhor aproximação disponível.
UPDATE "Solicitacao" s SET "prazoInicioEm" = (
  SELECT max(h."createdAt") FROM "HistoricoEvento" h
  WHERE h."solicitacaoId" = s."id" AND h."tipo" IN ('SOLICITACAO_ENVIADA', 'REENVIO_RECEBIDO')
)
WHERE s."status" IN ('ENVIADA', 'ANALISE') AND s."documentacaoValidada" = true;

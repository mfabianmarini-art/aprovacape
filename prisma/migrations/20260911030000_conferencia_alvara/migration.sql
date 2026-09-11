-- AlterEnum
ALTER TYPE "SolicitacaoStatus" ADD VALUE 'ALVARA_CONFERENCIA' BEFORE 'EXECUCAO';

-- AlterTable
ALTER TABLE "Solicitacao" ADD COLUMN     "alvaraNome" TEXT,
                          ADD COLUMN     "alvaraCaminho" TEXT,
                          ADD COLUMN     "alvaraTamanho" INTEGER,
                          ADD COLUMN     "alvaraEnviadoEm" TIMESTAMP(3),
                          ADD COLUMN     "alvaraRecusa" TEXT,
                          ADD COLUMN     "statusAntesAlvara" "SolicitacaoStatus";

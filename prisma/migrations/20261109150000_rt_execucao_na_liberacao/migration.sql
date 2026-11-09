-- Profissional da execução ainda não contratado no protocolo: informado na liberação da obra.
-- AlterTable
ALTER TABLE "Solicitacao" ADD COLUMN     "rtExecucaoNaLiberacao" BOOLEAN NOT NULL DEFAULT false;

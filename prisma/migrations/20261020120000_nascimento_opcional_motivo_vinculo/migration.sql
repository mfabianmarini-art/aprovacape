-- Data de nascimento deixa de ser obrigatória; motivo da reprovação do vínculo.
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "vinculoMotivoRecusa" TEXT,
ALTER COLUMN "birthDate" DROP NOT NULL;


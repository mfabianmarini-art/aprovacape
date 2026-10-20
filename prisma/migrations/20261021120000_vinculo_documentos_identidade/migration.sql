-- Pedido de vínculo do RT: RG ou CNH do proprietário e do responsável técnico.
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "vinculoDocPropCaminho" TEXT,
ADD COLUMN     "vinculoDocPropNome" TEXT,
ADD COLUMN     "vinculoDocPropTamanho" INTEGER,
ADD COLUMN     "vinculoDocRtCaminho" TEXT,
ADD COLUMN     "vinculoDocRtNome" TEXT,
ADD COLUMN     "vinculoDocRtTamanho" INTEGER;


-- Projeto em mais de um lote exige o projeto aprovado na Prefeitura e a ART da unificação;
-- a liberação da obra passa a exigir também o projeto carimbado pela Prefeitura.
ALTER TYPE "DocumentoTipo" ADD VALUE IF NOT EXISTS 'PROJETO_APROVADO_PREFEITURA';
ALTER TYPE "DocumentoTipo" ADD VALUE IF NOT EXISTS 'ART_UNIFICACAO';
ALTER TYPE "ArquivoCategoria" ADD VALUE IF NOT EXISTS 'PROJETO_PREFEITURA';

-- AlterTable
ALTER TABLE "Solicitacao" ADD COLUMN     "alvaraProjetoCaminho" TEXT,
ADD COLUMN     "alvaraProjetoNome" TEXT,
ADD COLUMN     "alvaraProjetoTamanho" INTEGER;

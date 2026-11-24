-- Proprietário pessoa jurídica: razão social (no campo de nome), CNPJ e responsável legal.
ALTER TABLE "Lote" ADD COLUMN "titularCnpj" TEXT;
ALTER TABLE "Lote" ADD COLUMN "titularRepresentanteNome" TEXT;
ALTER TABLE "Lote" ADD COLUMN "titularRepresentanteCpf" TEXT;

ALTER TABLE "User" ADD COLUMN "vinculoPropCnpj" TEXT;
ALTER TABLE "User" ADD COLUMN "vinculoPropRepresentanteNome" TEXT;
ALTER TABLE "User" ADD COLUMN "vinculoPropRepresentanteCpf" TEXT;
-- Comprovação de quem representa a empresa: contrato social ou cartão CNPJ.
ALTER TABLE "User" ADD COLUMN "vinculoDocEmpresaNome" TEXT;
ALTER TABLE "User" ADD COLUMN "vinculoDocEmpresaCaminho" TEXT;
ALTER TABLE "User" ADD COLUMN "vinculoDocEmpresaTamanho" INTEGER;

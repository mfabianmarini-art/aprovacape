-- Documentos criados pela CAPE por empreendimento, com formato, tamanho e exigência.
ALTER TYPE "DocumentoTipo" ADD VALUE IF NOT EXISTS 'PERSONALIZADO';

-- CreateTable
CREATE TABLE "DocumentoPersonalizado" (
    "id" TEXT NOT NULL,
    "empreendimentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "extensoes" TEXT[],
    "maxMB" INTEGER NOT NULL,
    "exigencia" "DocumentoExigencia" NOT NULL,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "excluidoEm" TIMESTAMP(3),

    CONSTRAINT "DocumentoPersonalizado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoPersonalizado_empreendimentoId_idx" ON "DocumentoPersonalizado"("empreendimentoId");

-- AddForeignKey
ALTER TABLE "DocumentoPersonalizado" ADD CONSTRAINT "DocumentoPersonalizado_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoPersonalizado" ADD CONSTRAINT "DocumentoPersonalizado_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Documento da solicitação passa a ser identificado pela chave (tipo padrão ou "p_<id>").
ALTER TABLE "SolicitacaoDocumento" ADD COLUMN "chave" TEXT;
ALTER TABLE "SolicitacaoDocumento" ADD COLUMN "rotulo" TEXT;
UPDATE "SolicitacaoDocumento" SET "chave" = "tipo"::text;
ALTER TABLE "SolicitacaoDocumento" ALTER COLUMN "chave" SET NOT NULL;

DROP INDEX "SolicitacaoDocumento_solicitacaoId_tipo_key";
CREATE UNIQUE INDEX "SolicitacaoDocumento_solicitacaoId_chave_key" ON "SolicitacaoDocumento"("solicitacaoId", "chave");

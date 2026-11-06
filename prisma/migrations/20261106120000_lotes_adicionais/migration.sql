-- Projeto que abrange mais de um lote do mesmo proprietário: os lotes além do principal,
-- cada um com a decisão da CAPE sobre o vínculo do RT.
ALTER TYPE "EventoTipo" ADD VALUE IF NOT EXISTS 'LOTE_ADICIONAL_APROVADO';
ALTER TYPE "EventoTipo" ADD VALUE IF NOT EXISTS 'LOTE_ADICIONAL_RECUSADO';

-- CreateTable
CREATE TABLE "SolicitacaoLoteAdicional" (
    "id" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "status" "VinculoStatus" NOT NULL DEFAULT 'PENDENTE',
    "revisadoPorId" TEXT,
    "revisadoEm" TIMESTAMP(3),
    "motivoRecusa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitacaoLoteAdicional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SolicitacaoLoteAdicional_solicitacaoId_loteId_key" ON "SolicitacaoLoteAdicional"("solicitacaoId", "loteId");

-- CreateIndex
CREATE INDEX "SolicitacaoLoteAdicional_loteId_idx" ON "SolicitacaoLoteAdicional"("loteId");

-- AddForeignKey
ALTER TABLE "SolicitacaoLoteAdicional" ADD CONSTRAINT "SolicitacaoLoteAdicional_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "Solicitacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoLoteAdicional" ADD CONSTRAINT "SolicitacaoLoteAdicional_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoLoteAdicional" ADD CONSTRAINT "SolicitacaoLoteAdicional_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

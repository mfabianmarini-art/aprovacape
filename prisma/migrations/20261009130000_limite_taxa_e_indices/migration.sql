-- Limite de tentativas por origem e índices das consultas mais frequentes.
-- CreateTable
CREATE TABLE "LimiteTaxa" (
    "chave" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "contagem" INTEGER NOT NULL,

    CONSTRAINT "LimiteTaxa_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX "Empreendimento_sindicoId_idx" ON "Empreendimento"("sindicoId");

-- CreateIndex
CREATE INDEX "Lote_rtId_idx" ON "Lote"("rtId");

-- CreateIndex
CREATE INDEX "Lote_proprietarioId_idx" ON "Lote"("proprietarioId");

-- CreateIndex
CREATE INDEX "Solicitacao_loteId_idx" ON "Solicitacao"("loteId");

-- CreateIndex
CREATE INDEX "Solicitacao_status_idx" ON "Solicitacao"("status");

-- CreateIndex
CREATE INDEX "HistoricoEvento_solicitacaoId_createdAt_idx" ON "HistoricoEvento"("solicitacaoId", "createdAt");

-- CreateIndex
CREATE INDEX "Irregularidade_solicitacaoId_idx" ON "Irregularidade"("solicitacaoId");

-- CreateIndex
CREATE INDEX "IrregularidadeEvidencia_irregularidadeId_idx" ON "IrregularidadeEvidencia"("irregularidadeId");


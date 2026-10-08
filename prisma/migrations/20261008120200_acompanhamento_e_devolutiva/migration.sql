-- Acompanhamento pelo proprietário em /acompanhar: senha por protocolo (cifrada, para o RT
-- poder consultá-la de novo) e freio de força bruta, como no login.
ALTER TABLE "Solicitacao" ADD COLUMN     "acompanhamentoBloqueadoAte" TIMESTAMP(3),
ADD COLUMN     "acompanhamentoSenhaCifrada" TEXT,
ADD COLUMN     "acompanhamentoTentativas" INTEGER NOT NULL DEFAULT 0;

-- Comentários gerais e arquivo de apontamentos (DWG marcado) que a CAPE manda ao RT com o
-- parecer do check-list.
CREATE TABLE "DevolutivaTecnica" (
    "id" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "comentario" TEXT,
    "arquivoNome" TEXT,
    "arquivoCaminho" TEXT,
    "arquivoTamanho" INTEGER,
    "autorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevolutivaTecnica_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DevolutivaTecnica_solicitacaoId_createdAt_idx" ON "DevolutivaTecnica"("solicitacaoId", "createdAt");

ALTER TABLE "DevolutivaTecnica" ADD CONSTRAINT "DevolutivaTecnica_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "Solicitacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DevolutivaTecnica" ADD CONSTRAINT "DevolutivaTecnica_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

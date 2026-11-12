-- Exigência de cada documento por empreendimento, editável pela CAPE.
CREATE TYPE "DocumentoExigencia" AS ENUM ('OBRIGATORIO', 'OBRIGATORIO_MAIS_LOTES', 'OPCIONAL', 'NAO_SOLICITADO');

-- CreateTable
CREATE TABLE "RegraDocumento" (
    "empreendimentoId" TEXT NOT NULL,
    "tipo" "DocumentoTipo" NOT NULL,
    "exigencia" "DocumentoExigencia" NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "atualizadoPorId" TEXT,

    CONSTRAINT "RegraDocumento_pkey" PRIMARY KEY ("empreendimentoId","tipo")
);

-- AddForeignKey
ALTER TABLE "RegraDocumento" ADD CONSTRAINT "RegraDocumento_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraDocumento" ADD CONSTRAINT "RegraDocumento_atualizadoPorId_fkey" FOREIGN KEY ("atualizadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

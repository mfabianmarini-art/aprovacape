-- CreateEnum
CREATE TYPE "EventoTipo" AS ENUM ('OUTRO', 'SOLICITACAO_ENVIADA', 'DOCUMENTACAO_DEVOLVIDA', 'REENVIO_RECEBIDO', 'CHECKLIST_DEVOLVIDO', 'PROJETO_APROVADO', 'ALVARA_ENVIADO', 'ALVARA_ACEITO', 'ALVARA_RECUSADO', 'IRREGULARIDADE_REGISTRADA', 'IRREGULARIDADE_REGULARIZADA', 'OBRA_CONCLUIDA');

-- CreateEnum
CREATE TYPE "IrregularidadeTipo" AS ENUM ('DIVERGENCIA_PROJETO', 'RECUO_OU_GABARITO', 'OBRA_SEM_APROVACAO', 'CANTEIRO_E_LIMPEZA', 'HORARIO_OU_RUIDO', 'DANO_A_AREA_COMUM', 'OUTRA');

-- AlterTable
ALTER TABLE "HistoricoEvento" ADD COLUMN     "tipo" "EventoTipo" NOT NULL DEFAULT 'OUTRO';

-- AlterTable
ALTER TABLE "Solicitacao" ADD COLUMN     "concluidaEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Irregularidade" (
    "id" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "tipo" "IrregularidadeTipo" NOT NULL,
    "descricao" TEXT NOT NULL,
    "registradaPorId" TEXT NOT NULL,
    "regularizadaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Irregularidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IrregularidadeEvidencia" (
    "id" TEXT NOT NULL,
    "irregularidadeId" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminhoArquivo" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,

    CONSTRAINT "IrregularidadeEvidencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoricoEvento_tipo_createdAt_idx" ON "HistoricoEvento"("tipo", "createdAt");

-- CreateIndex
CREATE INDEX "Irregularidade_createdAt_idx" ON "Irregularidade"("createdAt");

-- AddForeignKey
ALTER TABLE "Irregularidade" ADD CONSTRAINT "Irregularidade_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "Solicitacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Irregularidade" ADD CONSTRAINT "Irregularidade_registradaPorId_fkey" FOREIGN KEY ("registradaPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IrregularidadeEvidencia" ADD CONSTRAINT "IrregularidadeEvidencia_irregularidadeId_fkey" FOREIGN KEY ("irregularidadeId") REFERENCES "Irregularidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

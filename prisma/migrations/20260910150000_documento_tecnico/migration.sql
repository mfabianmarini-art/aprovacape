-- CreateEnum
CREATE TYPE "DocumentoTecnicoCategoria" AS ENUM ('MANUAL_PROPRIETARIO', 'CONVENCAO_CONDOMINIO', 'REGULAMENTO', 'OUTRO');

-- CreateTable
CREATE TABLE "DocumentoTecnico" (
    "id" TEXT NOT NULL,
    "empreendimentoId" TEXT NOT NULL,
    "categoria" "DocumentoTecnicoCategoria" NOT NULL DEFAULT 'OUTRO',
    "titulo" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminhoArquivo" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "enviadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoTecnico_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DocumentoTecnico" ADD CONSTRAINT "DocumentoTecnico_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoTecnico" ADD CONSTRAINT "DocumentoTecnico_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

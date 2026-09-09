-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CAPE_ANALISTA', 'SINDICO', 'PROPRIETARIO', 'RESPONSAVEL_TECNICO');

-- CreateEnum
CREATE TYPE "VinculoStatus" AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO');

-- CreateEnum
CREATE TYPE "SolicitacaoTipo" AS ENUM ('OBRA_NOVA', 'REFORMA', 'AMPLIACAO', 'DEMOLICAO', 'MURO');

-- CreateEnum
CREATE TYPE "SolicitacaoStatus" AS ENUM ('RASCUNHO', 'ENVIADA', 'ANALISE', 'COMPLEMENTO', 'APROVADA', 'RESSALVAS', 'REPROVADA', 'EXECUCAO', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "DocumentoTipo" AS ENUM ('PROJETO_ARQUITETONICO', 'ART_RRT', 'MEMORIAL_DESCRITIVO', 'PROJETO_ESTRUTURAL', 'DOC_RESPONSAVEL_TECNICO');

-- CreateEnum
CREATE TYPE "ChecklistItemStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REPROVADO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "creaCau" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vinculoStatus" "VinculoStatus",
    "vinculoLoteId" TEXT,
    "vinculoComprovacao" TEXT,
    "vinculoRevisadoPorId" TEXT,
    "vinculoRevisadoEm" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empreendimento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "numQuadras" INTEGER NOT NULL,
    "taxaAnaliseCent" INTEGER NOT NULL,
    "prazoDias" INTEGER NOT NULL DEFAULT 10,
    "reenviosSemTaxa" INTEGER NOT NULL DEFAULT 3,
    "taxaVisitaCent" INTEGER NOT NULL DEFAULT 0,
    "prazoComplementoDias" INTEGER NOT NULL DEFAULT 180,
    "plantaImageUrl" TEXT,
    "sindicoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empreendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quadra" (
    "id" TEXT NOT NULL,
    "empreendimentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "totalLotes" INTEGER NOT NULL,

    CONSTRAINT "Quadra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" TEXT NOT NULL,
    "empreendimentoId" TEXT NOT NULL,
    "quadraId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "rua" TEXT NOT NULL,
    "areaM2" DOUBLE PRECISION NOT NULL,
    "posX" DOUBLE PRECISION,
    "posY" DOUBLE PRECISION,
    "proprietarioId" TEXT,
    "rtId" TEXT,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistCategoria" (
    "id" TEXT NOT NULL,
    "empreendimentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChecklistCategoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Solicitacao" (
    "id" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "tipo" "SolicitacaoTipo" NOT NULL,
    "areaConstruida" DOUBLE PRECISION NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "SolicitacaoStatus" NOT NULL DEFAULT 'ENVIADA',
    "prazoDias" INTEGER NOT NULL,
    "reenvios" INTEGER NOT NULL DEFAULT 0,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "criadoPorId" TEXT NOT NULL,
    "responsavelTecnicoNome" TEXT NOT NULL,
    "responsavelTecnicoRegistro" TEXT NOT NULL,
    "responsavelTecnicoEmail" TEXT NOT NULL,
    "documentacaoValidada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "prazoAnaliseEm" TIMESTAMP(3),

    CONSTRAINT "Solicitacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoDocumento" (
    "id" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "tipo" "DocumentoTipo" NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminhoArquivo" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "validado" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitacaoDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistResultado" (
    "id" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" "ChecklistItemStatus" NOT NULL DEFAULT 'PENDENTE',
    "travado" BOOLEAN NOT NULL DEFAULT false,
    "avaliadoEm" TIMESTAMP(3),

    CONSTRAINT "ChecklistResultado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoEvento" (
    "id" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "autorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoEvento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Quadra_empreendimentoId_nome_key" ON "Quadra"("empreendimentoId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Lote_empreendimentoId_quadraId_numero_key" ON "Lote"("empreendimentoId", "quadraId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Solicitacao_protocolo_key" ON "Solicitacao"("protocolo");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitacaoDocumento_solicitacaoId_tipo_key" ON "SolicitacaoDocumento"("solicitacaoId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistResultado_solicitacaoId_itemId_key" ON "ChecklistResultado"("solicitacaoId", "itemId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_vinculoLoteId_fkey" FOREIGN KEY ("vinculoLoteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empreendimento" ADD CONSTRAINT "Empreendimento_sindicoId_fkey" FOREIGN KEY ("sindicoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quadra" ADD CONSTRAINT "Quadra_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_quadraId_fkey" FOREIGN KEY ("quadraId") REFERENCES "Quadra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_proprietarioId_fkey" FOREIGN KEY ("proprietarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_rtId_fkey" FOREIGN KEY ("rtId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistCategoria" ADD CONSTRAINT "ChecklistCategoria_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "ChecklistCategoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitacao" ADD CONSTRAINT "Solicitacao_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitacao" ADD CONSTRAINT "Solicitacao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoDocumento" ADD CONSTRAINT "SolicitacaoDocumento_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "Solicitacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistResultado" ADD CONSTRAINT "ChecklistResultado_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "Solicitacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistResultado" ADD CONSTRAINT "ChecklistResultado_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ChecklistItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoEvento" ADD CONSTRAINT "HistoricoEvento_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "Solicitacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoEvento" ADD CONSTRAINT "HistoricoEvento_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

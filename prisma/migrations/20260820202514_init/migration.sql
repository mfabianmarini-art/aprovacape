-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "creaCau" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vinculoStatus" TEXT,
    "vinculoLoteId" TEXT,
    "vinculoComprovacao" TEXT,
    "vinculoRevisadoPorId" TEXT,
    "vinculoRevisadoEm" DATETIME,
    CONSTRAINT "User_vinculoLoteId_fkey" FOREIGN KEY ("vinculoLoteId") REFERENCES "Lote" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Empreendimento" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Empreendimento_sindicoId_fkey" FOREIGN KEY ("sindicoId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quadra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empreendimentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "totalLotes" INTEGER NOT NULL,
    CONSTRAINT "Quadra_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empreendimentoId" TEXT NOT NULL,
    "quadraId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "rua" TEXT NOT NULL,
    "areaM2" REAL NOT NULL,
    "posX" REAL,
    "posY" REAL,
    "proprietarioId" TEXT,
    "rtId" TEXT,
    CONSTRAINT "Lote_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lote_quadraId_fkey" FOREIGN KEY ("quadraId") REFERENCES "Quadra" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lote_proprietarioId_fkey" FOREIGN KEY ("proprietarioId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lote_rtId_fkey" FOREIGN KEY ("rtId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChecklistCategoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empreendimentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ChecklistCategoria_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoriaId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ChecklistItem_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "ChecklistCategoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Solicitacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "protocolo" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "areaConstruida" REAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ENVIADA',
    "prazoDias" INTEGER NOT NULL,
    "reenvios" INTEGER NOT NULL DEFAULT 0,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "criadoPorId" TEXT NOT NULL,
    "responsavelTecnicoNome" TEXT NOT NULL,
    "responsavelTecnicoRegistro" TEXT NOT NULL,
    "responsavelTecnicoEmail" TEXT NOT NULL,
    "documentacaoValidada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "prazoAnaliseEm" DATETIME,
    CONSTRAINT "Solicitacao_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Solicitacao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SolicitacaoDocumento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "solicitacaoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminhoArquivo" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "validado" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SolicitacaoDocumento_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "Solicitacao" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChecklistResultado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "solicitacaoId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "travado" BOOLEAN NOT NULL DEFAULT false,
    "avaliadoEm" DATETIME,
    CONSTRAINT "ChecklistResultado_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "Solicitacao" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChecklistResultado_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ChecklistItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HistoricoEvento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "solicitacaoId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "autorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistoricoEvento_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "Solicitacao" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HistoricoEvento_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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

-- Inventário de arquivos (nada é apagado; versões substituídas ficam acessíveis),
-- registro de acessos e rescisão do contrato com o condomínio.
-- CreateEnum
CREATE TYPE "ArquivoCategoria" AS ENUM ('DOCUMENTO', 'DEVOLUTIVA', 'ALVARA', 'EVIDENCIA', 'VINCULO', 'DOCUMENTO_TECNICO', 'PLANTA', 'RECUPERADO');

-- AlterTable
ALTER TABLE "Empreendimento" ADD COLUMN     "arquivosExcluidosEm" TIMESTAMP(3),
ADD COLUMN     "contratoRescindidoEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Arquivo" (
    "id" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "hash" TEXT,
    "categoria" "ArquivoCategoria" NOT NULL,
    "documentoTipo" "DocumentoTipo",
    "solicitacaoId" TEXT,
    "empreendimentoId" TEXT,
    "usuarioId" TEXT,
    "enviadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "substituidoEm" TIMESTAMP(3),
    "excluidoEm" TIMESTAMP(3),

    CONSTRAINT "Arquivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcessoArquivo" (
    "id" TEXT NOT NULL,
    "arquivoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcessoArquivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Arquivo_caminho_key" ON "Arquivo"("caminho");

-- CreateIndex
CREATE INDEX "Arquivo_solicitacaoId_createdAt_idx" ON "Arquivo"("solicitacaoId", "createdAt");

-- CreateIndex
CREATE INDEX "Arquivo_empreendimentoId_idx" ON "Arquivo"("empreendimentoId");

-- CreateIndex
CREATE INDEX "Arquivo_hash_idx" ON "Arquivo"("hash");

-- CreateIndex
CREATE INDEX "AcessoArquivo_arquivoId_createdAt_idx" ON "AcessoArquivo"("arquivoId", "createdAt");

-- CreateIndex
CREATE INDEX "AcessoArquivo_usuarioId_createdAt_idx" ON "AcessoArquivo"("usuarioId", "createdAt");

-- AddForeignKey
ALTER TABLE "Arquivo" ADD CONSTRAINT "Arquivo_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "Solicitacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arquivo" ADD CONSTRAINT "Arquivo_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "Empreendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arquivo" ADD CONSTRAINT "Arquivo_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcessoArquivo" ADD CONSTRAINT "AcessoArquivo_arquivoId_fkey" FOREIGN KEY ("arquivoId") REFERENCES "Arquivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcessoArquivo" ADD CONSTRAINT "AcessoArquivo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Inventário inicial: tudo o que as tabelas de origem já referenciam. ids determinísticos
-- por origem (md5 do id de origem), para a migração poder ser reaplicada sem duplicar.
INSERT INTO "Arquivo" ("id", "caminho", "nome", "tamanho", "categoria", "documentoTipo", "solicitacaoId", "empreendimentoId", "createdAt")
SELECT 'doc' || md5(d."id"), d."caminhoArquivo", d."nomeArquivo", d."tamanhoBytes", 'DOCUMENTO', d."tipo", d."solicitacaoId", l."empreendimentoId", d."uploadedAt"
FROM "SolicitacaoDocumento" d
JOIN "Solicitacao" s ON s."id" = d."solicitacaoId"
JOIN "Lote" l ON l."id" = s."loteId"
WHERE d."caminhoArquivo" <> ''
ON CONFLICT ("caminho") DO NOTHING;

INSERT INTO "Arquivo" ("id", "caminho", "nome", "tamanho", "categoria", "solicitacaoId", "empreendimentoId", "enviadoPorId", "createdAt")
SELECT 'dev' || md5(v."id"), v."arquivoCaminho", v."arquivoNome", COALESCE(v."arquivoTamanho", 0), 'DEVOLUTIVA', v."solicitacaoId", l."empreendimentoId", v."autorId", v."createdAt"
FROM "DevolutivaTecnica" v
JOIN "Solicitacao" s ON s."id" = v."solicitacaoId"
JOIN "Lote" l ON l."id" = s."loteId"
WHERE v."arquivoCaminho" IS NOT NULL AND v."arquivoCaminho" <> ''
ON CONFLICT ("caminho") DO NOTHING;

INSERT INTO "Arquivo" ("id", "caminho", "nome", "tamanho", "categoria", "solicitacaoId", "empreendimentoId", "createdAt")
SELECT 'alv' || md5(s."id"), s."alvaraCaminho", COALESCE(s."alvaraNome", 'alvara.pdf'), COALESCE(s."alvaraTamanho", 0), 'ALVARA', s."id", l."empreendimentoId", COALESCE(s."alvaraEnviadoEm", s."updatedAt")
FROM "Solicitacao" s
JOIN "Lote" l ON l."id" = s."loteId"
WHERE s."alvaraCaminho" IS NOT NULL AND s."alvaraCaminho" <> ''
ON CONFLICT ("caminho") DO NOTHING;

INSERT INTO "Arquivo" ("id", "caminho", "nome", "tamanho", "categoria", "solicitacaoId", "empreendimentoId", "enviadoPorId", "createdAt")
SELECT 'evi' || md5(e."id"), e."caminhoArquivo", e."nomeArquivo", e."tamanhoBytes", 'EVIDENCIA', i."solicitacaoId", l."empreendimentoId", i."registradaPorId", i."createdAt"
FROM "IrregularidadeEvidencia" e
JOIN "Irregularidade" i ON i."id" = e."irregularidadeId"
JOIN "Solicitacao" s ON s."id" = i."solicitacaoId"
JOIN "Lote" l ON l."id" = s."loteId"
WHERE e."caminhoArquivo" <> ''
ON CONFLICT ("caminho") DO NOTHING;

INSERT INTO "Arquivo" ("id", "caminho", "nome", "tamanho", "categoria", "empreendimentoId", "enviadoPorId", "createdAt")
SELECT 'tec' || md5(t."id"), t."caminhoArquivo", t."nomeArquivo", t."tamanhoBytes", 'DOCUMENTO_TECNICO', t."empreendimentoId", t."enviadoPorId", t."createdAt"
FROM "DocumentoTecnico" t
WHERE t."caminhoArquivo" <> ''
ON CONFLICT ("caminho") DO NOTHING;

INSERT INTO "Arquivo" ("id", "caminho", "nome", "tamanho", "categoria", "empreendimentoId", "usuarioId", "createdAt")
SELECT 'vin' || md5(u."id"), u."vinculoArquivoCaminho", COALESCE(u."vinculoArquivoNome", 'autorizacao'), COALESCE(u."vinculoArquivoTamanho", 0), 'VINCULO', l."empreendimentoId", u."id", COALESCE(u."vinculoSolicitadoEm", u."createdAt")
FROM "User" u
LEFT JOIN "Lote" l ON l."id" = u."vinculoLoteId"
WHERE u."vinculoArquivoCaminho" IS NOT NULL AND u."vinculoArquivoCaminho" <> ''
ON CONFLICT ("caminho") DO NOTHING;

INSERT INTO "Arquivo" ("id", "caminho", "nome", "tamanho", "categoria", "empreendimentoId", "createdAt")
SELECT 'pla' || md5(e."id"), 'plantas/' || substring(e."plantaImageUrl" from '/api/plantas/(.*)$'), 'planta', 0, 'PLANTA', e."id", e."createdAt"
FROM "Empreendimento" e
WHERE e."plantaImageUrl" LIKE '/api/plantas/%'
ON CONFLICT ("caminho") DO NOTHING;

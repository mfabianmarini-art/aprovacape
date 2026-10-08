-- "Esqueci minha senha": tokens de redefinição (só o hash) e a data da última troca,
-- que invalida as sessões abertas antes dela.
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "senhaAlteradaEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RedefinicaoSenha" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedefinicaoSenha_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RedefinicaoSenha_tokenHash_key" ON "RedefinicaoSenha"("tokenHash");

-- CreateIndex
CREATE INDEX "RedefinicaoSenha_userId_createdAt_idx" ON "RedefinicaoSenha"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "RedefinicaoSenha" ADD CONSTRAINT "RedefinicaoSenha_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Até aqui o lote só sabia quem era o proprietário através de uma conta vinculada, e essa
-- conta só era gravada como efeito da aprovação de um vínculo. Venda do imóvel não tinha
-- onde ser registrada, e a conferência do CPF declarado pelo RT travava contra um dono
-- antigo sem caminho de correção.
ALTER TABLE "Lote"
  ADD COLUMN "titularNome" TEXT,
  ADD COLUMN "titularCpf" TEXT,
  ADD COLUMN "titularAtualizadoEm" TIMESTAMP(3),
  ADD COLUMN "titularAtualizadoPorId" TEXT;

ALTER TABLE "Lote"
  ADD CONSTRAINT "Lote_titularAtualizadoPorId_fkey"
  FOREIGN KEY ("titularAtualizadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Parte do dado já existe: onde há proprietário com conta, ele é o titular conhecido.
-- Sem isso, todo lote já vinculado passaria a não ter contra o que comparar.
UPDATE "Lote" l
   SET "titularNome" = u.name,
       "titularCpf" = regexp_replace(u.cpf, '[^0-9]', '', 'g')
  FROM "User" u
 WHERE u.id = l."proprietarioId"
   AND length(regexp_replace(u.cpf, '[^0-9]', '', 'g')) = 11;

ALTER TYPE "EventoTipo" ADD VALUE IF NOT EXISTS 'TITULAR_ALTERADO';

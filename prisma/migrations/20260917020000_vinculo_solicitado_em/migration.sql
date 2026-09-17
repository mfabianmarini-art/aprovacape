-- Usuário já cadastrado pode pedir vínculo com outro lote reaproveitando os campos
-- vinculo* do User, então a data do pedido passa a ser própria: createdAt é a da conta.
ALTER TABLE "User" ADD COLUMN "vinculoSolicitadoEm" TIMESTAMP(3);

-- Pedidos existentes foram feitos no auto-cadastro, junto com a conta.
UPDATE "User" SET "vinculoSolicitadoEm" = "createdAt" WHERE "vinculoStatus" IS NOT NULL;

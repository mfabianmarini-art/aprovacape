-- O RT anexa a autorização assinada pelo proprietário, mas até aqui não dizia de quem
-- era a assinatura. Estes campos guardam o proprietário declarado no pedido de vínculo,
-- para a CAPE conferir o documento contra uma pessoa identificada.
ALTER TABLE "User"
  ADD COLUMN "vinculoPropNome" TEXT,
  ADD COLUMN "vinculoPropCpf" TEXT,
  ADD COLUMN "vinculoPropEmail" TEXT,
  ADD COLUMN "vinculoPropTelefone" TEXT;

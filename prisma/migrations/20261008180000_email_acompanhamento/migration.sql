-- Protocolo e senha de acompanhamento passam a ir por e-mail ao proprietário e ao RT.
ALTER TABLE "Solicitacao" ADD COLUMN "proprietarioEmail" TEXT,
ADD COLUMN "acompanhamentoEnviadoEm" TIMESTAMP(3);

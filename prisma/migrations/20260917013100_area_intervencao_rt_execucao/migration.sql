-- "Área construída" virou "área de intervenção" na Nova solicitação: mesma coluna,
-- nome que reflete obras que não constroem área nova (demolição, muro, paisagismo).
ALTER TABLE "Solicitacao" RENAME COLUMN "areaConstruida" TO "areaIntervencao";

-- Responsável técnico passa a ser dois papéis: projeto e execução. Os campos
-- "responsavelTecnico*" existentes continuam sendo o RT do projeto.
ALTER TABLE "Solicitacao" ADD COLUMN "rtExecucaoNome" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Solicitacao" ADD COLUMN "rtExecucaoRegistro" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Solicitacao" ADD COLUMN "rtExecucaoEmail" TEXT NOT NULL DEFAULT '';

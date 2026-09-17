-- O lote guarda um único responsável técnico e um único proprietário, então aprovar um
-- vínculo sobre lote ocupado troca de pessoa. A troca passa a virar evento no histórico
-- das solicitações do lote; tipo próprio para não depender da redação do texto.
ALTER TYPE "EventoTipo" ADD VALUE IF NOT EXISTS 'VINCULO_SUBSTITUIDO';

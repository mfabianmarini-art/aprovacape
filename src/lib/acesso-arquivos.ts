import type { Role } from "@/generated/prisma/enums";

type Usuario = { id: string; role: Role };
type SolicitacaoComLote = {
  criadoPorId: string;
  lote: { proprietarioId: string | null; rtId: string | null; empreendimento: { sindicoId: string | null } };
};

// Quem pode abrir os arquivos de uma solicitação: a CAPE inteira; o síndico só do
// empreendimento que administra; o autor do protocolo (continua lendo o que enviou mesmo
// depois de trocar o RT do lote) e quem está vinculado ao lote. Um único lugar para as
// rotas de download não divergirem — o síndico chegou a ver arquivos de qualquer
// empreendimento porque cada rota repetia a regra a seu modo.
export function podeVerArquivosDaSolicitacao(u: Usuario, sol: SolicitacaoComLote) {
  if (u.role === "ADMIN_CAPE" || u.role === "CAPE_ANALISTA") return true;
  if (u.role === "SINDICO") return sol.lote.empreendimento.sindicoId === u.id;
  return sol.criadoPorId === u.id || sol.lote.proprietarioId === u.id || sol.lote.rtId === u.id;
}

export const INCLUI_LOTE_E_SINDICO = { lote: { include: { empreendimento: { select: { sindicoId: true } } } } } as const;

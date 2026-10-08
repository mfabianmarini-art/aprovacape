import { prisma } from "@/lib/prisma";
import type { Arquivo } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";

type Usuario = { id: string; role: Role };
type SolicitacaoComLote = {
  criadoPorId: string;
  lote: { proprietarioId: string | null; rtId: string | null; empreendimento: { sindicoId: string | null } };
};

const ehCape = (u: Usuario) => u.role === "ADMIN_CAPE" || u.role === "CAPE_ANALISTA";

// Quem pode abrir os arquivos de uma solicitação: a CAPE inteira; o síndico só do
// empreendimento que administra; o autor do protocolo (continua lendo o que enviou mesmo
// depois de trocar o RT do lote) e quem está vinculado ao lote. Um único lugar para as
// rotas de download não divergirem — o síndico chegou a ver arquivos de qualquer
// empreendimento porque cada rota repetia a regra a seu modo.
export function podeVerArquivosDaSolicitacao(u: Usuario, sol: SolicitacaoComLote) {
  if (ehCape(u)) return true;
  if (u.role === "SINDICO") return sol.lote.empreendimento.sindicoId === u.id;
  return sol.criadoPorId === u.id || sol.lote.proprietarioId === u.id || sol.lote.rtId === u.id;
}

export const INCLUI_LOTE_E_SINDICO = { lote: { include: { empreendimento: { select: { sindicoId: true } } } } } as const;

// Arquivos do empreendimento (documentos técnicos, planta): CAPE, o síndico dele e quem tem
// lote ali — inclusive com vínculo ainda em análise, porque os documentos técnicos são a
// referência para elaborar o projeto.
export async function podeVerArquivosDoEmpreendimento(u: Usuario, empreendimentoId: string) {
  if (ehCape(u)) return true;
  if (u.role === "SINDICO") {
    const emp = await prisma.empreendimento.findUnique({ where: { id: empreendimentoId }, select: { sindicoId: true } });
    return emp?.sindicoId === u.id;
  }
  if (u.role === "PROPRIETARIO" || u.role === "RESPONSAVEL_TECNICO") {
    const lote = await prisma.lote.findFirst({
      where: {
        empreendimentoId,
        OR: [
          { proprietarioId: u.id },
          { rtId: u.id },
          { vinculosPendentes: { some: { id: u.id, vinculoStatus: "PENDENTE" } } },
        ],
      },
      select: { id: true },
    });
    return !!lote;
  }
  return false;
}

// Gerir (enviar/retirar) documentos técnicos: CAPE em qualquer empreendimento, síndico só
// no que administra.
export async function podeGerirDocumentosTecnicos(u: Usuario, empreendimentoId: string) {
  if (ehCape(u)) return true;
  if (u.role !== "SINDICO") return false;
  const emp = await prisma.empreendimento.findUnique({ where: { id: empreendimentoId }, select: { sindicoId: true } });
  return emp?.sindicoId === u.id;
}

// Qualquer arquivo do inventário — é por aqui que se abrem as versões anteriores.
export async function podeVerArquivo(u: Usuario, a: Pick<Arquivo, "categoria" | "solicitacaoId" | "empreendimentoId" | "usuarioId">) {
  if (ehCape(u)) return true;
  if (a.categoria === "VINCULO") return a.usuarioId === u.id;
  if (a.solicitacaoId) {
    const sol = await prisma.solicitacao.findUnique({ where: { id: a.solicitacaoId }, include: INCLUI_LOTE_E_SINDICO });
    return !!sol && podeVerArquivosDaSolicitacao(u, sol);
  }
  if ((a.categoria === "DOCUMENTO_TECNICO" || a.categoria === "PLANTA") && a.empreendimentoId) {
    return podeVerArquivosDoEmpreendimento(u, a.empreendimentoId);
  }
  // Sem solicitação (rascunho cancelado) ou adotado sem metadados: só a CAPE.
  return false;
}

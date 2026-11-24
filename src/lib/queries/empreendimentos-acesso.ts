import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

export type EmpreendimentoOpcao = { id: string; nome: string };

// CAPE_ANALISTA/ADMIN_CAPE operam a CAPE inteira e enxergam todos os empreendimentos.
// SINDICO só enxerga o(s) empreendimento(s) ao qual está vinculado como síndico.
// PROPRIETARIO/RESPONSAVEL_TECNICO só enxergam o(s) empreendimento(s) onde têm algum lote.
export async function listEmpreendimentosAcessiveis(userId: string, role: Role): Promise<EmpreendimentoOpcao[]> {
  if (role === "SINDICO") {
    return prisma.empreendimento.findMany({
      where: { sindicoId: userId },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    });
  }
  if (role === "PROPRIETARIO" || role === "RESPONSAVEL_TECNICO") {
    // O lote só é atribuído quando a CAPE aprova o vínculo, mas quem está aguardando
    // análise já precisa do empreendimento para consultar os documentos técnicos — é
    // com eles que o projeto é elaborado. Vínculo recusado não entra: a recusa só troca
    // o status, o vinculoLoteId continua apontando para o lote.
    const pendente = await prisma.user.findFirst({
      where: { id: userId, vinculoStatus: "PENDENTE" },
      select: { vinculoLote: { select: { empreendimentoId: true } } },
    });
    const empPendenteId = pendente?.vinculoLote?.empreendimentoId;

    return prisma.empreendimento.findMany({
      where: {
        OR: [
          { lotes: { some: { OR: [{ proprietarioId: userId }, { rtId: userId }] } } },
          ...(empPendenteId ? [{ id: empPendenteId }] : []),
        ],
      },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    });
  }
  return prisma.empreendimento.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } });
}

// Resolve qual empreendimento exibir: o solicitado via query string (?emp=), se acessível,
// senão o primeiro da lista acessível ao usuário.
export async function resolveEmpreendimentoAtual(userId: string, role: Role, solicitado?: string) {
  const opcoes = await listEmpreendimentosAcessiveis(userId, role);
  return escolher(opcoes, solicitado);
}

// Documentos técnicos (Normas para aprovação): o RT consulta os de qualquer empreendimento,
// mesmo sem vínculo. É ali que está o modelo da procuração que ele precisa anexar para
// pedir o vínculo — exigir o vínculo antes era um ciclo sem saída. O pedido de vínculo já
// lista todos os empreendimentos, então não há o que esconder. Os empreendimentos onde ele
// já tem lote (ou vínculo em análise) vêm primeiro, para continuarem sendo o padrão.
export async function resolveEmpreendimentoDocumentos(userId: string, role: Role, solicitado?: string) {
  const proprios = await listEmpreendimentosAcessiveis(userId, role);
  if (role !== "RESPONSAVEL_TECNICO") return escolher(proprios, solicitado);
  const todos = await prisma.empreendimento.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } });
  const idsProprios = new Set(proprios.map((o) => o.id));
  return escolher([...proprios, ...todos.filter((o) => !idsProprios.has(o.id))], solicitado);
}

function escolher(opcoes: EmpreendimentoOpcao[], solicitado?: string) {
  const atual = (solicitado && opcoes.find((o) => o.id === solicitado)) || opcoes[0] || null;
  return { atual, opcoes };
}

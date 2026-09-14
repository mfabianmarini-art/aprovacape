import { prisma } from "@/lib/prisma";
import type { EventoTipo } from "@/generated/prisma/enums";

// O período vem de <input type="date"> ("2026-09-01"). Interpretar em UTC puro
// deslocaria o corte em 3h; o dia começa e termina em Brasília.
const OFFSET_BRASIL = "-03:00";

export function inicioDoDia(data: string) {
  return new Date(`${data}T00:00:00.000${OFFSET_BRASIL}`);
}
export function fimDoDia(data: string) {
  return new Date(`${data}T23:59:59.999${OFFSET_BRASIL}`);
}

export function periodoPadrao() {
  const hoje = new Date();
  const inicio = new Date(hoje.getTime() - 29 * 86_400_000);
  const iso = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
  return { de: iso(inicio), ate: iso(hoje) };
}

export async function getRelatorio(empreendimentoId: string, de: string, ate: string) {
  const inicio = inicioDoDia(de);
  const fim = fimDoDia(ate);
  const noLote = { solicitacao: { lote: { empreendimentoId } } };

  const [eventos, irregularidadesPeriodo, solicitacoes, irregularidadesAbertas] = await Promise.all([
    // Contagem por tipo de evento: é o que diz quantos serviços a CAPE prestou no período.
    prisma.historicoEvento.groupBy({
      by: ["tipo"],
      where: { ...noLote, createdAt: { gte: inicio, lte: fim } },
      _count: { _all: true },
    }),
    prisma.irregularidade.findMany({
      where: { ...noLote, createdAt: { gte: inicio, lte: fim } },
      orderBy: { createdAt: "desc" },
      include: {
        registradaPor: { select: { name: true } },
        solicitacao: { select: { protocolo: true, lote: { select: { numero: true, quadra: { select: { nome: true } } } } } },
      },
    }),
    // Panorama: retrato de agora, não do período — "quantas obras estão em andamento"
    // é uma pergunta sobre o presente.
    prisma.solicitacao.groupBy({
      by: ["status"],
      where: { lote: { empreendimentoId }, status: { not: "RASCUNHO" } },
      _count: { _all: true },
    }),
    prisma.irregularidade.count({ where: { ...noLote, regularizadaEm: null } }),
  ]);

  const porEvento = (tipo: EventoTipo) => eventos.find((e) => e.tipo === tipo)?._count._all ?? 0;
  const porStatus = (status: string) => solicitacoes.find((s) => s.status === status)?._count._all ?? 0;

  const analises = porEvento("SOLICITACAO_ENVIADA");
  const reanalises = porEvento("REENVIO_RECEBIDO");

  return {
    periodo: { de, ate },
    atividade: [
      { rotulo: "Solicitações recebidas", valor: analises, cor: "#E01B22" },
      { rotulo: "Reanálises (documentação complementada)", valor: reanalises, cor: "#8A5210" },
      { rotulo: "Projetos aprovados", valor: porEvento("PROJETO_APROVADO"), cor: "#24603A" },
      { rotulo: "Devoluções no check-list", valor: porEvento("CHECKLIST_DEVOLVIDO"), cor: "#B4711A" },
      { rotulo: "Devoluções na validação documental", valor: porEvento("DOCUMENTACAO_DEVOLVIDA"), cor: "#B4711A" },
      { rotulo: "Alvarás conferidos e aceitos", valor: porEvento("ALVARA_ACEITO"), cor: "#4B3A7A" },
      { rotulo: "Alvarás recusados", valor: porEvento("ALVARA_RECUSADO"), cor: "#8C2B22" },
      { rotulo: "Irregularidades registradas", valor: porEvento("IRREGULARIDADE_REGISTRADA"), cor: "#8C2B22" },
      { rotulo: "Irregularidades regularizadas", valor: porEvento("IRREGULARIDADE_REGULARIZADA"), cor: "#24603A" },
      { rotulo: "Obras concluídas e arquivadas", valor: porEvento("OBRA_CONCLUIDA"), cor: "#231F20" },
    ],
    totalAtendimentos: analises + reanalises,
    panorama: [
      { rotulo: "Em análise (validação documental)", valor: porStatus("ENVIADA"), cor: "#E01B22" },
      { rotulo: "Em análise técnica", valor: porStatus("ANALISE"), cor: "#E01B22" },
      { rotulo: "Aguardando complementação", valor: porStatus("COMPLEMENTO"), cor: "#B4711A" },
      { rotulo: "Aprovadas, aguardando alvará", valor: porStatus("APROVADA") + porStatus("RESSALVAS"), cor: "#24603A" },
      { rotulo: "Alvará em conferência", valor: porStatus("ALVARA_CONFERENCIA"), cor: "#4B3A7A" },
      { rotulo: "Obras aprovadas (em andamento)", valor: porStatus("EXECUCAO"), cor: "#3B3486" },
      { rotulo: "Concluídas / arquivadas", valor: porStatus("CONCLUIDA"), cor: "#231F20" },
      { rotulo: "Com irregularidade em aberto", valor: irregularidadesAbertas, cor: "#8C2B22" },
    ],
    irregularidades: irregularidadesPeriodo,
  };
}

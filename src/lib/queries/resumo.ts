import { prisma } from "@/lib/prisma";
import { diasUteisRestantes, prazoAnaliseTexto } from "@/lib/prazo";
import { SELECT_VERSOES_ANTERIORES } from "@/components/VersoesAnteriores";
import { STATUS_INFO, LIVRE_INFO } from "@/lib/status";
import type { SolicitacaoStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

const ATIVOS: SolicitacaoStatus[] = ["ENVIADA", "ANALISE", "COMPLEMENTO"];
const APROVADOS: SolicitacaoStatus[] = ["APROVADA", "RESSALVAS"];

// Campos rasos: o resumo carrega todos os lotes de uma vez, então cada relação aninhada
// aqui se multiplica pelo loteamento inteiro.
const INCLUDE_SOLICITACAO = {
  historico: {
    orderBy: { createdAt: "desc" },
    include: { autor: { select: { name: true, role: true } } },
  },
  criadoPor: { select: { name: true, role: true } },
  documentos: { select: { id: true, tipo: true, rotulo: true, nomeArquivo: true, validado: true } },
  // Só as versões substituídas — poucas, e por contrato disponíveis ao condomínio.
  arquivos: SELECT_VERSOES_ANTERIORES,
  irregularidades: {
    orderBy: { createdAt: "desc" },
    select: { id: true, tipo: true, createdAt: true, regularizadaEm: true },
  },
  // Projeto em mais de um lote: todos os lotes que ele cobre, para o painel listar.
  // Recusado pela CAPE não faz parte da aprovação.
  lote: { select: { id: true, numero: true, quadra: { select: { nome: true } } } },
  lotesAdicionais: {
    where: { status: { not: "RECUSADO" } },
    orderBy: { createdAt: "asc" },
    select: { status: true, lote: { select: { id: true, numero: true, quadra: { select: { nome: true } } } } },
  },
} satisfies Prisma.SolicitacaoInclude;

function diasDesde(d: Date) {
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

export async function getResumoData(empreendimentoId: string) {
  const emp = await prisma.empreendimento.findUnique({
    where: { id: empreendimentoId },
    include: {
      quadras: { orderBy: { nome: "asc" } },
      lotes: {
        orderBy: [{ quadra: { nome: "asc" } }, { numero: "asc" }],
        include: {
          quadra: true,
          proprietario: true,
          rt: true,
          solicitacoes: { orderBy: { createdAt: "desc" }, include: INCLUDE_SOLICITACAO },
          // O lote também é colorido pelo projeto de que é lote adicional, senão aparece
          // livre na planta com a obra aprovada.
          comoLoteAdicional: {
            where: { status: { not: "RECUSADO" } },
            include: { solicitacao: { include: INCLUDE_SOLICITACAO } },
          },
        },
      },
    },
  });
  if (!emp) return null;

  const lotesComStatus = emp.lotes.map(({ comoLoteAdicional, ...l }) => {
    const solicitacoes = [...l.solicitacoes, ...comoLoteAdicional.map((a) => a.solicitacao)].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const atual = solicitacoes[0];
    const statusInfo = atual ? STATUS_INFO[atual.status] : LIVRE_INFO;
    const historico = solicitacoes
      .flatMap((s) => s.historico.map((h) => ({ ...h, protocolo: s.protocolo })))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    // Irregularidade pertence ao lote, não ao protocolo da vez: uma obra apontada
    // continua apontada enquanto ninguém regularizar, mesmo com outro protocolo aberto.
    const irregularidadesAbertas = solicitacoes.reduce(
      (n, s) => n + s.irregularidades.filter((i) => !i.regularizadaEm).length,
      0,
    );
    return { ...l, solicitacoes, statusAtual: atual ?? null, statusInfo, historico, irregularidadesAbertas };
  });

  // Os indicadores contam protocolos: um projeto em três lotes é uma solicitação, não três.
  const porProtocolo = (lotes: typeof lotesComStatus) => [...new Map(lotes.map((l) => [l.statusAtual!.id, l])).values()];

  const totalLotes = emp.quadras.reduce((a, q) => a + q.totalLotes, 0);
  const ativos = porProtocolo(lotesComStatus.filter((l) => l.statusAtual && ATIVOS.includes(l.statusAtual.status)));
  const complemento = porProtocolo(lotesComStatus.filter((l) => l.statusAtual?.status === "COMPLEMENTO"));
  const aprovados = porProtocolo(lotesComStatus.filter((l) => l.statusAtual && APROVADOS.includes(l.statusAtual.status)));
  const execucao = porProtocolo(lotesComStatus.filter((l) => l.statusAtual?.status === "EXECUCAO"));
  const comIrregularidade = lotesComStatus.filter((l) => l.irregularidadesAbertas > 0);

  const emRisco = porProtocolo(lotesComStatus.filter((l) => {
    const s = l.statusAtual;
    if (!s) return false;
    if (s.status === "ANALISE" || s.status === "ENVIADA") {
      const r = diasUteisRestantes(s);
      return r !== null && r <= 3;
    }
    if (s.status === "COMPLEMENTO") return diasDesde(s.updatedAt) > emp.prazoComplementoDias - 60;
    return false;
  }));

  const indicadores = [
    { valor: String(totalLotes), rotulo: "Lotes cadastrados", cor: "#231F20" },
    { valor: String(ativos.length), rotulo: "Solicitações ativas", cor: "#E01B22" },
    { valor: String(complemento.length), rotulo: "Aguardando complementação", cor: "#B4711A" },
    { valor: String(emRisco.length), rotulo: `Em risco de prazo (${emp.prazoDias} dias úteis)`, cor: "#8C2B22" },
    { valor: String(aprovados.length), rotulo: "Projetos aprovados", cor: "#24603A" },
    { valor: String(execucao.length), rotulo: "Obras aprovadas", cor: "#3B3486" },
    { valor: String(comIrregularidade.length), rotulo: "Lotes com irregularidade", cor: "#8C2B22" },
  ];

  const quadras = emp.quadras.map((q) => {
    const lotesDaQuadra = lotesComStatus.filter((l) => l.quadraId === q.id);
    const emAndamento = lotesDaQuadra.filter((l) => l.statusAtual && ATIVOS.includes(l.statusAtual.status)).length;
    const buckets = new Map<string, { cor: string; n: number }>();
    for (const l of lotesDaQuadra) {
      const key = l.statusInfo.bg;
      const b = buckets.get(key) ?? { cor: key, n: 0 };
      b.n += 1;
      buckets.set(key, b);
    }
    const barras = Array.from(buckets.values())
      .filter((b) => b.cor !== LIVRE_INFO.bg)
      .map((b) => ({ cor: b.cor, w: `${((b.n / q.totalLotes) * 100).toFixed(1)}%` }));
    return {
      nome: `Quadra ${q.nome}`,
      resumo: `${q.totalLotes} lotes${emAndamento ? ` · ${emAndamento} em andamento` : ""}`,
      barras,
    };
  });

  const prazosEmRisco = emRisco
    .slice()
    .sort((a, b) => (diasUteisRestantes(a.statusAtual!) ?? 0) - (diasUteisRestantes(b.statusAtual!) ?? 0))
    .slice(0, 4)
    .map((l) => {
      const s = l.statusAtual!;
      const lotes = `${s.lote.quadra.nome} L${s.lote.numero}${s.lotesAdicionais.length ? ` + ${s.lotesAdicionais.length} lote(s)` : ""}`;
      const texto =
        s.status !== "COMPLEMENTO"
          ? `${s.protocolo} · ${lotes} — prazo de ${prazoAnaliseTexto(s)}.`
          : `${s.protocolo} · ${lotes} — complementação pendente há ${diasDesde(s.updatedAt)} dias (limite ${emp.prazoComplementoDias} dias).`;
      return { texto, cor: s.status !== "COMPLEMENTO" ? "#8C2B22" : "#8A5210" };
    });

  const legenda = (
    [
      ["ENVIADA", STATUS_INFO.ENVIADA],
      ["ANALISE", STATUS_INFO.ANALISE],
      ["COMPLEMENTO", STATUS_INFO.COMPLEMENTO],
      ["APROVADA", STATUS_INFO.APROVADA],
      ["REPROVADA", STATUS_INFO.REPROVADA],
      ["EXECUCAO", STATUS_INFO.EXECUCAO],
      ["CONCLUIDA", STATUS_INFO.CONCLUIDA],
    ] as const
  ).map(([, info]) => ({ label: info.label, cor: info.bg }));
  legenda.push({ label: LIVRE_INFO.label, cor: LIVRE_INFO.bg });

  return {
    empreendimento: emp,
    lotes: lotesComStatus,
    indicadores,
    quadras,
    prazosEmRisco,
    legenda,
  };
}

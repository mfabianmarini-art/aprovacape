import { prisma } from "@/lib/prisma";
import { STATUS_INFO, LIVRE_INFO } from "@/lib/status";
import type { SolicitacaoStatus } from "@/generated/prisma/enums";

const ATIVOS: SolicitacaoStatus[] = ["ENVIADA", "ANALISE", "COMPLEMENTO"];
const APROVADOS: SolicitacaoStatus[] = ["APROVADA", "RESSALVAS"];

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
          solicitacoes: {
            orderBy: { createdAt: "desc" },
            include: {
              historico: {
                orderBy: { createdAt: "desc" },
                include: { autor: { select: { name: true, role: true } } },
              },
              // Campos rasos: o resumo carrega todos os lotes de uma vez, então cada
              // relação aninhada aqui se multiplica pelo loteamento inteiro.
              criadoPor: { select: { name: true, role: true } },
              documentos: { select: { id: true, tipo: true, nomeArquivo: true, validado: true } },
            },
          },
        },
      },
    },
  });
  if (!emp) return null;

  const lotesComStatus = emp.lotes.map((l) => {
    const atual = l.solicitacoes[0];
    const statusInfo = atual ? STATUS_INFO[atual.status] : LIVRE_INFO;
    const historico = l.solicitacoes
      .flatMap((s) => s.historico.map((h) => ({ ...h, protocolo: s.protocolo })))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { ...l, statusAtual: atual ?? null, statusInfo, historico };
  });

  const totalLotes = emp.quadras.reduce((a, q) => a + q.totalLotes, 0);
  const ativos = lotesComStatus.filter((l) => l.statusAtual && ATIVOS.includes(l.statusAtual.status));
  const complemento = lotesComStatus.filter((l) => l.statusAtual?.status === "COMPLEMENTO");
  const aprovados = lotesComStatus.filter((l) => l.statusAtual && APROVADOS.includes(l.statusAtual.status));
  const execucao = lotesComStatus.filter((l) => l.statusAtual?.status === "EXECUCAO");

  const emRisco = lotesComStatus.filter((l) => {
    const s = l.statusAtual;
    if (!s) return false;
    if (s.status === "ANALISE") return s.prazoDias - diasDesde(s.createdAt) <= 3;
    if (s.status === "COMPLEMENTO") return diasDesde(s.updatedAt) > emp.prazoComplementoDias - 60;
    return false;
  });

  const indicadores = [
    { valor: String(totalLotes), rotulo: "Lotes cadastrados", cor: "#0E1B24" },
    { valor: String(ativos.length), rotulo: "Solicitações ativas", cor: "#12455E" },
    { valor: String(complemento.length), rotulo: "Aguardando complementação", cor: "#B4711A" },
    { valor: String(emRisco.length), rotulo: `Em risco de prazo (${emp.prazoDias} dias)`, cor: "#8C2B22" },
    { valor: String(aprovados.length), rotulo: "Projetos aprovados", cor: "#24603A" },
    { valor: String(execucao.length), rotulo: "Obras em execução", cor: "#3B3486" },
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
    .sort((a, b) => diasDesde(b.statusAtual!.createdAt) - diasDesde(a.statusAtual!.createdAt))
    .slice(0, 4)
    .map((l) => {
      const s = l.statusAtual!;
      const texto =
        s.status === "ANALISE"
          ? `${s.protocolo} · ${l.quadra.nome} L${l.numero} — ${Math.max(0, s.prazoDias - diasDesde(s.createdAt))} dias corridos restantes do prazo de ${s.prazoDias} dias.`
          : `${s.protocolo} · ${l.quadra.nome} L${l.numero} — complementação pendente há ${diasDesde(s.updatedAt)} dias (limite ${emp.prazoComplementoDias} dias).`;
      return { texto, cor: s.status === "ANALISE" ? "#8C2B22" : "#8A5210" };
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

export function diasDesde(d: Date) {
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

// Prazo de análise: DIAS ÚTEIS (segunda a sexta, menos feriados nacionais), contados a
// partir da validação da documentação (Solicitacao.prazoInicioEm). O número vem da
// configuração do empreendimento e é copiado para a solicitação no protocolo.

const FUSO = "America/Sao_Paulo";

// Data civil em Brasília, como "AAAA-MM-DD".
function dataCivil(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function pascoa(ano: number) {
  // Algoritmo de Meeus/Jones/Butcher.
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(ano, mes - 1, dia);
}

const cacheFeriados = new Map<number, Set<string>>();
function feriadosNacionais(ano: number) {
  let f = cacheFeriados.get(ano);
  if (!f) {
    const fixos = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"].map((md) => `${ano}-${md}`);
    const sextaSanta = new Date(pascoa(ano) - 2 * 86_400_000).toISOString().slice(0, 10);
    f = new Set([...fixos, sextaSanta]);
    cacheFeriados.set(ano, f);
  }
  return f;
}

function ehDiaUtil(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return dow !== 0 && dow !== 6 && !feriadosNacionais(a).has(iso);
}

function proximoDia(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10);
}

// Dias úteis decorridos depois de `inicio` até `fim` (o dia do início não conta).
export function diasUteisEntre(inicio: Date, fim = new Date()) {
  let dia = dataCivil(inicio);
  const ultimo = dataCivil(fim);
  let n = 0;
  while (dia < ultimo) {
    dia = proximoDia(dia);
    if (ehDiaUtil(dia)) n++;
  }
  return n;
}

// Dias úteis que ainda restam do prazo; null enquanto a documentação não foi validada.
export function diasUteisRestantes(s: { prazoDias: number; prazoInicioEm: Date | null }, agora = new Date()) {
  if (!s.prazoInicioEm) return null;
  return s.prazoDias - diasUteisEntre(s.prazoInicioEm, agora);
}

export function prazoTexto(s: { status: string; prazoDias: number; prazoInicioEm: Date | null; updatedAt: Date }) {
  switch (s.status) {
    case "ENVIADA":
    case "ANALISE": {
      const r = diasUteisRestantes(s);
      if (r === null) return `${s.prazoDias} dias úteis após validação`;
      return r >= 0 ? `${r} dias úteis restantes` : `${-r} dias úteis em atraso`;
    }
    case "COMPLEMENTO":
      return "aguardando envio";
    default:
      return `atualizado ${diasDesde(s.updatedAt)}d atrás`;
  }
}

// "10 dias úteis · 4 restantes", para os quadros de dados da solicitação.
export function prazoAnaliseTexto(s: { status: string; prazoDias: number; prazoInicioEm: Date | null }) {
  const base = `${s.prazoDias} dias úteis`;
  if (s.status !== "ENVIADA" && s.status !== "ANALISE") return base;
  const r = diasUteisRestantes(s);
  if (r === null) return `${base} · conta da validação documental`;
  return `${base} · ${r >= 0 ? `${r} restantes` : `${-r} em atraso`}`;
}

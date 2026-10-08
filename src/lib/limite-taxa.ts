import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Limite de tentativas por origem (IP), guardado no próprio Postgres — sem serviço extra.
// Complementa o bloqueio por conta (auth.ts): aquele freia quem insiste numa conta; este,
// quem testa muitas contas, cadastra em massa ou dispara e-mails de redefinição.
// O IP é gravado só como HMAC: dá para contar sem guardar o endereço de ninguém.
export const LIMITES = {
  login: { max: 30, janelaMs: 15 * 60 * 1000 },
  cadastro: { max: 5, janelaMs: 60 * 60 * 1000 },
  redefinicao: { max: 10, janelaMs: 60 * 60 * 1000 },
  acompanhar: { max: 30, janelaMs: 15 * 60 * 1000 },
  // Alerta de erro por e-mail (instrumentation.ts): um por rota por hora.
  alerta: { max: 1, janelaMs: 60 * 60 * 1000 },
} as const;
export type AcaoLimitada = keyof typeof LIMITES;

// Na Vercel, x-real-ip e o primeiro x-forwarded-for vêm da própria plataforma.
export function ipDaRequisicao(h: Headers) {
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
}

function chave(acao: AcaoLimitada, ip: string) {
  const segredo = process.env.AUTH_SECRET ?? "";
  return `${acao}:${createHmac("sha256", segredo).update(ip).digest("hex").slice(0, 32)}`;
}

// Conta uma tentativa e diz se passou do limite. Um único comando atômico: janela vencida
// recomeça do 1, senão soma — duas requisições simultâneas não escapam da contagem.
export async function registrarTentativa(acao: AcaoLimitada, ip: string): Promise<boolean> {
  const { max, janelaMs } = LIMITES[acao];
  const k = chave(acao, ip);
  const corte = new Date(Date.now() - janelaMs);
  const [r] = await prisma.$queryRaw<{ contagem: number }[]>`
    INSERT INTO "LimiteTaxa" ("chave", "inicio", "contagem") VALUES (${k}, now(), 1)
    ON CONFLICT ("chave") DO UPDATE SET
      "contagem" = CASE WHEN "LimiteTaxa"."inicio" < ${corte} THEN 1 ELSE "LimiteTaxa"."contagem" + 1 END,
      "inicio"   = CASE WHEN "LimiteTaxa"."inicio" < ${corte} THEN now() ELSE "LimiteTaxa"."inicio" END
    RETURNING "contagem"`;
  return r.contagem > max;
}

// Só consulta, sem contar — para a tela explicar por que o login foi recusado.
export async function limiteExcedido(acao: AcaoLimitada, ip: string) {
  const { max, janelaMs } = LIMITES[acao];
  const r = await prisma.limiteTaxa.findUnique({ where: { chave: chave(acao, ip) } });
  return !!r && r.inicio > new Date(Date.now() - janelaMs) && r.contagem > max;
}

export async function ipAtual() {
  return ipDaRequisicao(await headers());
}

export function mensagemLimite(acao: AcaoLimitada) {
  const min = Math.round(LIMITES[acao].janelaMs / 60000);
  return `Muitas tentativas a partir desta conexão. Aguarde ${min >= 60 ? `${min / 60} hora(s)` : `${min} minutos`} e tente de novo.`;
}

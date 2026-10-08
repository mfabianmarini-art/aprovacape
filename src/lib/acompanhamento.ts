import crypto from "node:crypto";

// Sem 0/O e 1/I, que se confundem ditados por telefone ou copiados à mão. São exatamente
// 32 símbolos, então cada byte aleatório mapeia sem viés (256 é múltiplo de 32). 8
// símbolos ≈ 40 bits, que com o bloqueio após 5 tentativas não se adivinham.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function gerarSenhaAcompanhamento() {
  return [...crypto.randomBytes(8)].map((b) => ALFABETO[b % ALFABETO.length]).join("");
}

// Grava e compara sempre na forma normalizada: o proprietário pode digitar com hífen,
// espaço ou minúsculas.
export function normalizarSenha(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatarSenha(s: string) {
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4)}` : s;
}

function segredo() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET não configurado.");
  return s;
}

function chave() {
  return crypto.createHash("sha256").update(`acompanhamento:${segredo()}`).digest();
}

export function cifrarSenha(senha: string) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", chave(), iv);
  const enc = Buffer.concat([c.update(senha, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}

export function decifrarSenha(cifrada: string): string | null {
  try {
    const [iv, tag, enc] = cifrada.split(".").map((p) => Buffer.from(p, "base64url"));
    const d = crypto.createDecipheriv("aes-256-gcm", chave(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function senhaConfere(digitada: string, cifrada: string) {
  const real = decifrarSenha(cifrada);
  const a = Buffer.from(normalizarSenha(digitada));
  if (!real || a.length !== real.length) return false;
  return crypto.timingSafeEqual(a, Buffer.from(real));
}

// O cookie do proprietário prova que a senha foi digitada, sem guardar a senha. Amarrado à
// senha cifrada atual: quando o RT gera outra, os acessos abertos com a antiga caem.
export function cookieAcompanhamento(solicitacaoId: string) {
  return `cape_acomp_${solicitacaoId}`;
}

export function tokenAcompanhamento(solicitacaoId: string, senhaCifrada: string) {
  return crypto.createHmac("sha256", segredo()).update(`${solicitacaoId}:${senhaCifrada}`).digest("base64url");
}

export function tokenConfere(token: string | undefined, solicitacaoId: string, senhaCifrada: string) {
  if (!token) return false;
  const esperado = Buffer.from(tokenAcompanhamento(solicitacaoId, senhaCifrada));
  const recebido = Buffer.from(token);
  return recebido.length === esperado.length && crypto.timingSafeEqual(recebido, esperado);
}

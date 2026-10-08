import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { montarEmail } from "@/lib/email-layout";
import { digitosCpf } from "@/lib/cpf";

export const VALIDADE_TOKEN_MS = 30 * 60 * 1000;
// Pedidos por conta por hora. Acima disto o pedido é ignorado em silêncio — barra o uso do
// formulário para encher a caixa de alguém de e-mails.
export const MAX_PEDIDOS_POR_HORA = 3;
export const MIN_SENHA = 8;
// O bcrypt só considera os primeiros 72 bytes; acima disso, parte da senha seria ignorada.
export const MAX_SENHA_BYTES = 72;

// 256 bits aleatórios; vai no link e nunca é gravado — o banco guarda só o hash.
export function gerarTokenRedefinicao() {
  return randomBytes(32).toString("base64url");
}

// Token de alta entropia dispensa salt e hash lento: SHA-256 basta para que um vazamento
// do banco não entregue links utilizáveis, e permite buscar pelo hash.
export function hashTokenRedefinicao(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Confere o token sem consumi-lo — para a página dizer de saída que o link venceu, em vez
// de deixar a pessoa digitar a senha nova à toa. Abrir o link não gasta o token, então a
// pré-visualização que alguns provedores de e-mail fazem também não.
export async function tokenRedefinicaoValido(token: string) {
  if (!token) return false;
  const r = await prisma.redefinicaoSenha.findUnique({ where: { tokenHash: hashTokenRedefinicao(token) } });
  return !!r && !r.usadoEm && r.expiraEm > new Date();
}

export function problemaNaSenha(senha: string, confirmar: string, conta: { email: string; cpf: string }) {
  if (senha.length < MIN_SENHA) return `A senha precisa ter pelo menos ${MIN_SENHA} caracteres.`;
  if (new TextEncoder().encode(senha).length > MAX_SENHA_BYTES) return "Senha longa demais (máximo de 72 caracteres).";
  if (senha !== confirmar) return "As senhas não coincidem.";
  const s = senha.trim().toLowerCase();
  // Usuários internos têm um marcador no lugar do CPF; só compara quando há CPF de fato.
  const cpf = digitosCpf(conta.cpf);
  if (s === conta.email.toLowerCase() || (cpf.length === 11 && digitosCpf(s) === cpf)) return "A senha não pode ser o seu e-mail ou CPF.";
  return null;
}

export function emailRedefinicao(d: { nome: string; link: string }) {
  return montarEmail({
    assunto: "CAPE Aprova — redefinição de senha",
    cabecalho: "Sua conta",
    titulo: "Redefinição de senha",
    cor: "#E01B22",
    paragrafos: [
      `Olá, ${d.nome}. Recebemos um pedido para redefinir a senha da sua conta na CAPE Aprova.`,
      "Se não foi você, ignore este e-mail: sua senha atual continua valendo e ninguém consegue alterá-la sem este link.",
    ],
    acao: "Clique no botão abaixo e escolha uma nova senha. O link vale por 30 minutos e só pode ser usado uma vez.",
    link: { url: d.link, rotulo: "Redefinir minha senha" },
    rodape: "Por segurança, a CAPE nunca pede sua senha por e-mail ou telefone. Este é um e-mail automático da CAPE Aprova.",
  });
}

export function emailSenhaAlterada(d: { nome: string; linkEsqueci: string }) {
  return montarEmail({
    assunto: "CAPE Aprova — sua senha foi alterada",
    cabecalho: "Sua conta",
    titulo: "Senha alterada",
    cor: "#24603A",
    paragrafos: [
      `Olá, ${d.nome}. A senha da sua conta na CAPE Aprova acabou de ser alterada. As sessões abertas em outros dispositivos foram encerradas.`,
    ],
    acao: "Se foi você, nenhuma ação é necessária. Se não foi, redefina a senha agora pelo link abaixo e avise a CAPE.",
    link: { url: d.linkEsqueci, rotulo: "Redefinir a senha" },
  });
}

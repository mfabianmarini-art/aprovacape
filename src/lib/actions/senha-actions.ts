"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { digitosCpf } from "@/lib/cpf";
import { enviarEmail } from "@/lib/email";
import { urlConfiavelDoApp } from "@/lib/url-app";
import { ipAtual, mensagemLimite, registrarTentativa } from "@/lib/limite-taxa";
import {
  MAX_PEDIDOS_POR_HORA,
  VALIDADE_TOKEN_MS,
  emailRedefinicao,
  emailSenhaAlterada,
  gerarTokenRedefinicao,
  hashTokenRedefinicao,
  problemaNaSenha,
} from "@/lib/redefinicao-senha";

export type PedidoRedefinicaoState = { error?: string; enviado?: boolean } | null;

// A resposta é sempre a mesma, exista a conta ou não, e todo o trabalho (busca, token,
// e-mail) roda depois da resposta: nem a mensagem nem o tempo de resposta dizem a quem
// tenta se um e-mail ou CPF tem conta aqui.
export async function pedirRedefinicaoSenhaAction(_prev: PedidoRedefinicaoState, formData: FormData): Promise<PedidoRedefinicaoState> {
  const identificador = String(formData.get("identificador") ?? "").trim().slice(0, 254);
  if (!identificador) return { error: "Informe o e-mail ou o CPF da sua conta." };
  // Por origem, além do limite por conta: freia quem dispara pedidos para muitas contas.
  if (await registrarTentativa("redefinicao", await ipAtual())) return { error: mensagemLimite("redefinicao") };

  after(async () => {
    try {
      await processarPedido(identificador);
    } catch (e) {
      console.error("[senha] falha ao processar pedido de redefinição:", e);
    }
  });
  return { enviado: true };
}

async function processarPedido(identificador: string) {
  const digitos = digitosCpf(identificador);
  const contas = await prisma.user.findMany({
    where: {
      // Como no login (identificador-login.ts): CPF como digitado ou só dígitos.
      OR: [
        { email: { equals: identificador, mode: "insensitive" } },
        { cpf: identificador },
        ...(digitos.length === 11 ? [{ cpf: digitos }] : []),
      ],
    },
    select: { id: true, name: true, email: true },
    take: 2,
  });
  // Nenhuma ou ambígua (dois e-mails que só diferem na caixa): não manda nada.
  if (contas.length !== 1) return;
  const conta = contas[0];

  const umaHora = new Date(Date.now() - 60 * 60 * 1000);
  const recentes = await prisma.redefinicaoSenha.count({ where: { userId: conta.id, createdAt: { gt: umaHora } } });
  if (recentes >= MAX_PEDIDOS_POR_HORA) return;

  const token = gerarTokenRedefinicao();
  // Só o link mais recente vale: os pendentes vencem na hora. Vencem em vez de sumir porque
  // são eles que contam no limite por hora; só o que passou de um dia é apagado.
  const agora = new Date();
  await prisma.$transaction([
    prisma.redefinicaoSenha.deleteMany({ where: { userId: conta.id, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    prisma.redefinicaoSenha.updateMany({ where: { userId: conta.id, usadoEm: null, expiraEm: { gt: agora } }, data: { expiraEm: agora } }),
    prisma.redefinicaoSenha.create({
      data: { userId: conta.id, tokenHash: hashTokenRedefinicao(token), expiraEm: new Date(Date.now() + VALIDADE_TOKEN_MS) },
    }),
  ]);

  const base = await urlConfiavelDoApp();
  const link = `${base}/redefinir-senha?token=${encodeURIComponent(token)}`;
  await enviarEmail({ para: [conta.email], ...emailRedefinicao({ nome: conta.name.split(" ")[0], link }) });
}

export type RedefinirSenhaState = { error?: string } | null;

const LINK_INVALIDO = "Este link de redefinição é inválido, já foi usado ou expirou. Peça um novo.";

export async function redefinirSenhaAction(_prev: RedefinirSenhaState, formData: FormData): Promise<RedefinirSenhaState> {
  const token = String(formData.get("token") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const confirmar = String(formData.get("confirmarSenha") ?? "");
  if (!token) return { error: LINK_INVALIDO };

  const pedido = await prisma.redefinicaoSenha.findUnique({
    where: { tokenHash: hashTokenRedefinicao(token) },
    include: { user: { select: { id: true, name: true, email: true, cpf: true } } },
  });
  if (!pedido || pedido.usadoEm || pedido.expiraEm <= new Date()) return { error: LINK_INVALIDO };

  const problema = problemaNaSenha(senha, confirmar, pedido.user);
  if (problema) return { error: problema };

  const passwordHash = await bcrypt.hash(senha, 12);
  const agora = new Date();

  // Tudo numa transação, com o token consumido de forma condicional: de dois envios
  // simultâneos com o mesmo link só um troca a senha, e token gasto sem senha trocada não
  // acontece.
  const trocou = await prisma.$transaction(async (tx) => {
    const consumido = await tx.redefinicaoSenha.updateMany({
      where: { id: pedido.id, usadoEm: null, expiraEm: { gt: agora } },
      data: { usadoEm: agora },
    });
    if (consumido.count !== 1) return false;
    // senhaAlteradaEm derruba as sessões abertas antes (conferido no callback jwt de
    // auth.ts); o bloqueio por tentativas zera, porque quem provou ter o e-mail é o dono.
    await tx.user.update({
      where: { id: pedido.user.id },
      data: { passwordHash, senhaAlteradaEm: agora, tentativasLogin: 0, bloqueadoAte: null },
    });
    await tx.redefinicaoSenha.deleteMany({ where: { userId: pedido.user.id, id: { not: pedido.id } } });
    return true;
  });
  if (!trocou) return { error: LINK_INVALIDO };

  const base = await urlConfiavelDoApp();
  after(async () => {
    const r = await enviarEmail({
      para: [pedido.user.email],
      ...emailSenhaAlterada({ nome: pedido.user.name.split(" ")[0], linkEsqueci: `${base}/esqueci-senha` }),
    });
    if (!r.enviado) console.error("[senha] aviso de senha alterada não saiu:", r);
  });

  // Sem login automático: a pessoa entra com a senha nova, como de costume.
  redirect("/login?senha=redefinida");
}

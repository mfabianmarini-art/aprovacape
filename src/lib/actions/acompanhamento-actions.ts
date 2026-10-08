"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cookieAcompanhamento, senhaConfere, tokenAcompanhamento } from "@/lib/acompanhamento";
import { ipAtual, mensagemLimite, registrarTentativa } from "@/lib/limite-taxa";

// Mesmo freio do login: 5 erros seguidos travam este protocolo por 15 minutos.
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 15 * 60 * 1000;
// Não diz qual dos dois está errado, para não confirmar que um protocolo existe.
const ERRO = "Protocolo ou senha inválidos.";

export type AcompanharState = { error?: string } | null;

export async function entrarAcompanhamentoAction(_prev: AcompanharState, formData: FormData): Promise<AcompanharState> {
  const protocolo = String(formData.get("protocolo") ?? "").trim().toUpperCase();
  const senha = String(formData.get("senha") ?? "");
  if (!protocolo || !senha.trim()) return { error: "Informe o protocolo e a senha." };
  // O bloqueio por protocolo não freia quem varre protocolos diferentes; este freia.
  if (await registrarTentativa("acompanhar", await ipAtual())) return { error: mensagemLimite("acompanhar") };

  const sol = await prisma.solicitacao.findUnique({
    where: { protocolo },
    select: {
      id: true,
      status: true,
      updatedAt: true,
      acompanhamentoSenhaCifrada: true,
      acompanhamentoTentativas: true,
      acompanhamentoBloqueadoAte: true,
    },
  });
  if (!sol || sol.status === "RASCUNHO" || !sol.acompanhamentoSenhaCifrada) return { error: ERRO };

  if (sol.acompanhamentoBloqueadoAte && sol.acompanhamentoBloqueadoAte > new Date()) {
    const minutos = Math.max(1, Math.ceil((sol.acompanhamentoBloqueadoAte.getTime() - Date.now()) / 60000));
    return { error: `Muitas tentativas seguidas. Tente de novo em ${minutos} minuto(s).` };
  }

  // updatedAt repassado tal como está: o resumo mede há quanto tempo uma complementação
  // está parada por ele, e uma senha digitada errado não pode zerar esse relógio.
  if (!senhaConfere(senha, sol.acompanhamentoSenhaCifrada)) {
    const tentativas = sol.acompanhamentoTentativas + 1;
    await prisma.solicitacao.update({
      where: { id: sol.id },
      data:
        tentativas >= MAX_TENTATIVAS
          ? { acompanhamentoTentativas: 0, acompanhamentoBloqueadoAte: new Date(Date.now() + BLOQUEIO_MS), updatedAt: sol.updatedAt }
          : { acompanhamentoTentativas: tentativas, updatedAt: sol.updatedAt },
    });
    return { error: ERRO };
  }

  if (sol.acompanhamentoTentativas > 0 || sol.acompanhamentoBloqueadoAte) {
    await prisma.solicitacao.update({
      where: { id: sol.id },
      data: { acompanhamentoTentativas: 0, acompanhamentoBloqueadoAte: null, updatedAt: sol.updatedAt },
    });
  }

  (await cookies()).set(cookieAcompanhamento(sol.id), tokenAcompanhamento(sol.id, sol.acompanhamentoSenhaCifrada), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/acompanhar",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(`/acompanhar/${encodeURIComponent(protocolo)}`);
}

export async function sairAcompanhamentoAction(solicitacaoId: string) {
  (await cookies()).delete({ name: cookieAcompanhamento(solicitacaoId), path: "/acompanhar" });
  redirect("/acompanhar");
}

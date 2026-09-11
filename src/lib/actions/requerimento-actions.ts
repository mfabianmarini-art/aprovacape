"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

async function loadOwnedSolicitacao(session: Awaited<ReturnType<typeof requireRole>>, solicitacaoId: string) {
  const sol = await prisma.solicitacao.findUniqueOrThrow({ where: { id: solicitacaoId }, include: { lote: true } });
  const isOwner = sol.lote.proprietarioId === session.user.id || sol.lote.rtId === session.user.id;
  if (!isOwner) throw new Error("Solicitação não pertence a este usuário.");
  return sol;
}

export async function reenviarComplementacaoAction(solicitacaoId: string) {
  const session = await requireRole("PROPRIETARIO", "RESPONSAVEL_TECNICO");
  const sol = await loadOwnedSolicitacao(session, solicitacaoId);
  if (sol.status !== "COMPLEMENTO") return;

  // Conta aqui, quando a documentação nova chega de fato — contar na devolução fazia
  // cada clique do analista consumir uma tentativa. E só conta o ciclo do check-list:
  // devolução na conferência documental é acerto de forma, não reanálise técnica.
  const emp = await prisma.empreendimento.findUniqueOrThrow({ where: { id: sol.lote.empreendimentoId } });
  const conta = sol.devolvidaNoChecklist;
  const reenvios = conta ? sol.reenvios + 1 : sol.reenvios;

  await prisma.$transaction([
    prisma.solicitacao.update({
      where: { id: sol.id },
      data: {
        status: "ENVIADA",
        documentacaoValidada: false,
        devolvidaNoChecklist: false,
        reenvios,
        pago: conta && reenvios > emp.reenviosSemTaxa ? false : sol.pago,
      },
    }),
    prisma.solicitacaoDocumento.updateMany({ where: { solicitacaoId: sol.id }, data: { validado: false } }),
    prisma.historicoEvento.create({
      data: {
        solicitacaoId: sol.id,
        texto: conta
          ? `Reenvio ${reenvios} de ${emp.reenviosSemTaxa} recebido. Aguardando nova validação documental.`
          : "Documentação complementada recebida. Aguardando nova validação documental.",
        cor: "#8FB0BF",
        autorId: session.user.id,
      },
    }),
  ]);

  revalidatePath("/requerimentos");
  revalidatePath("/fila");
  revalidatePath(`/analise/${sol.protocolo}`);
}

export async function enviarAlvaraAction(solicitacaoId: string) {
  const session = await requireRole("PROPRIETARIO", "RESPONSAVEL_TECNICO");
  const sol = await loadOwnedSolicitacao(session, solicitacaoId);
  if (sol.status !== "RESSALVAS" && sol.status !== "APROVADA") return;

  await prisma.$transaction([
    prisma.solicitacao.update({ where: { id: sol.id }, data: { status: "EXECUCAO" } }),
    prisma.historicoEvento.create({
      data: {
        solicitacaoId: sol.id,
        texto: "Alvará de execução da Prefeitura apresentado. Obra liberada para início.",
        cor: "#3B3486",
        autorId: session.user.id,
      },
    }),
  ]);

  revalidatePath("/requerimentos");
  revalidatePath("/resumo");
}

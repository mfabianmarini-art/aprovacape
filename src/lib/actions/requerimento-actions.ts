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

  // O reenvio é contado aqui, quando a documentação nova chega de fato. Contar na
  // devolução fazia cada clique do analista consumir uma das tentativas gratuitas.
  const emp = await prisma.empreendimento.findUniqueOrThrow({ where: { id: sol.lote.empreendimentoId } });
  const reenvios = sol.reenvios + 1;

  await prisma.$transaction([
    prisma.solicitacao.update({
      where: { id: sol.id },
      data: {
        status: "ENVIADA",
        documentacaoValidada: false,
        reenvios,
        pago: reenvios > emp.reenviosSemTaxa ? false : sol.pago,
      },
    }),
    prisma.solicitacaoDocumento.updateMany({ where: { solicitacaoId: sol.id }, data: { validado: false } }),
    prisma.historicoEvento.create({
      data: {
        solicitacaoId: sol.id,
        texto: `Reenvio ${reenvios} de ${emp.reenviosSemTaxa} recebido. Aguardando nova validação documental.`,
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

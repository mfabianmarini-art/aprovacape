"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

// O gestor CAPE cadastra só a quadra e o número do lote (e, opcionalmente, sua posição no
// mapa). Endereço e área são preenchidos pelo proprietário/RT na primeira solicitação de
// obra do lote — ver criarRascunhoAction em nova-actions.ts.
const loteSchema = z.object({
  numero: z.string().trim().min(1, "Informe o número do lote"),
  posX: z.string().optional(),
  posY: z.string().optional(),
});

export type LoteState = { error?: string; ok?: boolean } | null;

function parsePos(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function addLoteAction(
  empreendimentoId: string,
  quadraId: string,
  _prev: LoteState,
  formData: FormData,
): Promise<LoteState> {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const parsed = loteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  const existente = await prisma.lote.findFirst({ where: { quadraId, numero: d.numero } });
  if (existente) return { error: "Já existe um lote com esse número nesta quadra." };

  await prisma.lote.create({
    data: {
      empreendimentoId,
      quadraId,
      numero: d.numero,
      posX: parsePos(d.posX),
      posY: parsePos(d.posY),
    },
  });

  revalidatePath("/empreendimentos");
  revalidatePath("/resumo");
  revalidatePath("/login");
  return { error: undefined, ok: true };
}

export async function updateLoteAction(loteId: string, field: "numero", value: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const v = value.trim();
  if (!v) return;
  await prisma.lote.update({ where: { id: loteId }, data: { [field]: v } });
  revalidatePath("/empreendimentos");
  revalidatePath("/resumo");
}

export async function updateLotePosicaoAction(loteId: string, posX: number, posY: number) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  await prisma.lote.update({ where: { id: loteId }, data: { posX, posY } });
  revalidatePath("/empreendimentos");
  revalidatePath("/resumo");
}

export async function deleteLoteAction(loteId: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const lote = await prisma.lote.findUniqueOrThrow({ where: { id: loteId } });
  const [solicitacoes, vinculosPendentes] = await Promise.all([
    prisma.solicitacao.count({ where: { loteId } }),
    prisma.user.count({ where: { vinculoLoteId: loteId } }),
  ]);
  // Não remove um lote já com solicitações, vínculo pendente ou proprietário/RT vinculado —
  // essas relações precisam ser desfeitas antes, fora desta tela.
  if (solicitacoes > 0 || vinculosPendentes > 0 || lote.proprietarioId || lote.rtId) return;

  await prisma.lote.delete({ where: { id: loteId } });

  revalidatePath("/empreendimentos");
  revalidatePath("/resumo");
  revalidatePath("/login");
}

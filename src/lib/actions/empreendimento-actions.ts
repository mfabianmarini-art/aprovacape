"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { put } from "@vercel/blob";
import path from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

function parseBRL(v: string): number {
  const normalized = v.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Math.round((Number.isFinite(n) ? n : 0) * 100);
}

const schema = z.object({
  empreendimentoId: z.string().min(1),
  numQuadras: z.coerce.number().int().positive(),
  taxaAnalise: z.string().min(1),
  prazoDias: z.coerce.number().int().positive(),
  reenviosSemTaxa: z.coerce.number().int().nonnegative(),
  taxaVisita: z.string().min(1),
});

const createSchema = z.object({
  nome: z.string().min(2, "Informe o nome do empreendimento"),
  cidade: z.string().min(2, "Informe a cidade"),
  uf: z.string().length(2, "Use a sigla da UF (ex.: SP)"),
  numQuadras: z.coerce.number().int().positive(),
  taxaAnalise: z.string().min(1),
  prazoDias: z.coerce.number().int().positive(),
});

export type CreateEmpreendimentoState = { error?: string } | null;

// Só Admin CAPE cria novos empreendimentos — analistas comuns apenas editam os já existentes.
export async function createEmpreendimentoAction(
  _prev: CreateEmpreendimentoState,
  formData: FormData,
): Promise<CreateEmpreendimentoState> {
  await requireRole("ADMIN_CAPE");
  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  const emp = await prisma.empreendimento.create({
    data: {
      nome: d.nome,
      cidade: d.cidade,
      uf: d.uf.toUpperCase(),
      numQuadras: d.numQuadras,
      taxaAnaliseCent: parseBRL(d.taxaAnalise),
      prazoDias: d.prazoDias,
    },
  });

  revalidatePath("/empreendimentos");
  redirect(`/empreendimentos?emp=${emp.id}`);
}

export async function updateEmpreendimentoAction(_prev: unknown, formData: FormData) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  await prisma.empreendimento.update({
    where: { id: d.empreendimentoId },
    data: {
      numQuadras: d.numQuadras,
      taxaAnaliseCent: parseBRL(d.taxaAnalise),
      prazoDias: d.prazoDias,
      reenviosSemTaxa: d.reenviosSemTaxa,
      taxaVisitaCent: parseBRL(d.taxaVisita),
    },
  });

  revalidatePath("/empreendimentos");
  return { error: undefined, ok: true };
}

export async function uploadPlantaAction(empreendimentoId: string, _prev: unknown, formData: FormData) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const file = formData.get("planta");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione uma imagem." };
  if (!file.type.startsWith("image/")) return { error: "Envie um arquivo de imagem." };
  if (file.size > 10 * 1024 * 1024) return { error: "Imagem maior que 10 MB." };

  const ext = path.extname(file.name) || ".png";
  const filename = `${empreendimentoId}-${Date.now()}${ext}`;
  await put(`plantas/${filename}`, file, { access: "private", contentType: file.type });

  await prisma.empreendimento.update({ where: { id: empreendimentoId }, data: { plantaImageUrl: `/api/plantas/${filename}` } });

  revalidatePath("/empreendimentos");
  revalidatePath("/resumo");
  return { error: undefined, ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
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

export async function updateEmpreendimentoAction(_prev: unknown, formData: FormData) {
  await requireRole("CAPE_ANALISTA");
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
  await requireRole("CAPE_ANALISTA");
  const file = formData.get("planta");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione uma imagem." };
  if (!file.type.startsWith("image/")) return { error: "Envie um arquivo de imagem." };
  if (file.size > 10 * 1024 * 1024) return { error: "Imagem maior que 10 MB." };

  const dir = path.join(process.cwd(), "public", "plantas");
  await mkdir(dir, { recursive: true });
  const ext = path.extname(file.name) || ".png";
  const filename = `${empreendimentoId}-${Date.now()}${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  await prisma.empreendimento.update({ where: { id: empreendimentoId }, data: { plantaImageUrl: `/plantas/${filename}` } });

  revalidatePath("/empreendimentos");
  revalidatePath("/resumo");
  return { error: undefined, ok: true };
}

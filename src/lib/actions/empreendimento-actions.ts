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
  taxaAnalise: z.string().min(1),
  prazoDias: z.coerce.number().int().positive(),
  reenviosSemTaxa: z.coerce.number().int().nonnegative(),
  taxaVisita: z.string().min(1),
});

const createSchema = z.object({
  nome: z.string().min(2, "Informe o nome do empreendimento"),
  cidade: z.string().min(2, "Informe a cidade"),
  uf: z.string().length(2, "Use a sigla da UF (ex.: SP)"),
  taxaAnalise: z.string().min(1),
  prazoDias: z.coerce.number().int().positive(),
});

// Uma quadra por linha do formulário: nome livre (A, B, A1, F2…) + quantidade de lotes,
// que varia livremente de quadra para quadra.
const quadraRowSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome de cada quadra"),
  totalLotes: z.coerce.number().int().positive("Informe a quantidade de lotes de cada quadra"),
});

function parseQuadraRows(formData: FormData): { error: string } | { quadras: { nome: string; totalLotes: number }[] } {
  const nomes = formData.getAll("quadraNome").map(String);
  const totais = formData.getAll("quadraLotes").map(String);
  const linhas = nomes
    .map((nome, i) => ({ nome, totalLotes: totais[i] }))
    .filter((l) => l.nome.trim() !== "" || l.totalLotes.trim() !== "");

  if (linhas.length === 0) return { error: "Adicione ao menos uma quadra." };

  const quadras: { nome: string; totalLotes: number }[] = [];
  for (const linha of linhas) {
    const row = quadraRowSchema.safeParse(linha);
    if (!row.success) return { error: row.error.issues[0]?.message ?? "Dados de quadra inválidos." };
    quadras.push(row.data);
  }

  const nomesUnicos = new Set(quadras.map((q) => q.nome));
  if (nomesUnicos.size !== quadras.length) return { error: "Os nomes das quadras não podem se repetir." };

  return { quadras };
}

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

  const quadrasResult = parseQuadraRows(formData);
  if ("error" in quadrasResult) return { error: quadrasResult.error };

  const emp = await prisma.empreendimento.create({
    data: {
      nome: d.nome,
      cidade: d.cidade,
      uf: d.uf.toUpperCase(),
      numQuadras: quadrasResult.quadras.length,
      taxaAnaliseCent: parseBRL(d.taxaAnalise),
      prazoDias: d.prazoDias,
      quadras: { create: quadrasResult.quadras },
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
      taxaAnaliseCent: parseBRL(d.taxaAnalise),
      prazoDias: d.prazoDias,
      reenviosSemTaxa: d.reenviosSemTaxa,
      taxaVisitaCent: parseBRL(d.taxaVisita),
    },
  });

  revalidatePath("/empreendimentos");
  return { error: undefined, ok: true };
}

// Quadras são cadastradas e mantidas separadamente do formulário geral do empreendimento,
// já que a quantidade e os nomes variam livremente (A, B, A1, F2…) empreendimento a empreendimento.
export type QuadraState = { error?: string; ok?: boolean } | null;

export async function addQuadraAction(empreendimentoId: string, _prev: QuadraState, formData: FormData): Promise<QuadraState> {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const parsed = quadraRowSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const existente = await prisma.quadra.findFirst({ where: { empreendimentoId, nome: parsed.data.nome } });
  if (existente) return { error: "Já existe uma quadra com esse nome neste empreendimento." };

  await prisma.$transaction([
    prisma.quadra.create({ data: { empreendimentoId, nome: parsed.data.nome, totalLotes: parsed.data.totalLotes } }),
    prisma.empreendimento.update({ where: { id: empreendimentoId }, data: { numQuadras: { increment: 1 } } }),
  ]);

  revalidatePath("/empreendimentos");
  revalidatePath("/resumo");
  return { error: undefined, ok: true };
}

export async function updateQuadraAction(quadraId: string, field: "nome" | "totalLotes", value: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  if (field === "nome") {
    const nome = value.trim();
    if (!nome) return;
    await prisma.quadra.update({ where: { id: quadraId }, data: { nome } });
  } else {
    const totalLotes = Math.round(Number(value));
    if (!Number.isFinite(totalLotes) || totalLotes <= 0) return;
    await prisma.quadra.update({ where: { id: quadraId }, data: { totalLotes } });
  }
  revalidatePath("/empreendimentos");
  revalidatePath("/resumo");
}

export async function deleteQuadraAction(quadraId: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const quadra = await prisma.quadra.findUniqueOrThrow({ where: { id: quadraId } });
  const lotesExistentes = await prisma.lote.count({ where: { quadraId } });
  if (lotesExistentes > 0) return; // quadra com lotes já cadastrados não pode ser removida por aqui

  await prisma.$transaction([
    prisma.quadra.delete({ where: { id: quadraId } }),
    prisma.empreendimento.update({ where: { id: quadra.empreendimentoId }, data: { numQuadras: { decrement: 1 } } }),
  ]);

  revalidatePath("/empreendimentos");
  revalidatePath("/resumo");
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

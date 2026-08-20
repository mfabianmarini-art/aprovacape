"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function renameCategoriaAction(categoriaId: string, nome: string) {
  await requireRole("CAPE_ANALISTA");
  if (!nome.trim()) return;
  await prisma.checklistCategoria.update({ where: { id: categoriaId }, data: { nome: nome.trim() } });
  revalidatePath("/checklists");
}

export async function updateItemAction(itemId: string, field: "texto" | "referencia", value: string) {
  await requireRole("CAPE_ANALISTA");
  await prisma.checklistItem.update({ where: { id: itemId }, data: { [field]: value } });
  revalidatePath("/checklists");
}

export async function deleteItemAction(itemId: string) {
  await requireRole("CAPE_ANALISTA");
  await prisma.checklistResultado.deleteMany({ where: { itemId } });
  await prisma.checklistItem.delete({ where: { id: itemId } });
  revalidatePath("/checklists");
}

export async function addItemAction(categoriaId: string, formData: FormData) {
  await requireRole("CAPE_ANALISTA");
  const texto = String(formData.get("texto") ?? "").trim();
  const referencia = String(formData.get("referencia") ?? "").trim();
  if (!texto) return;
  const count = await prisma.checklistItem.count({ where: { categoriaId } });
  await prisma.checklistItem.create({ data: { categoriaId, texto, referencia, ordem: count } });
  revalidatePath("/checklists");
}

export async function addCategoriaAction(empreendimentoId: string) {
  await requireRole("CAPE_ANALISTA");
  const count = await prisma.checklistCategoria.count({ where: { empreendimentoId } });
  await prisma.checklistCategoria.create({ data: { empreendimentoId, nome: "Nova categoria", ordem: count } });
  revalidatePath("/checklists");
}

export async function deleteCategoriaAction(categoriaId: string) {
  await requireRole("CAPE_ANALISTA");
  const itens = await prisma.checklistItem.findMany({ where: { categoriaId } });
  await prisma.checklistResultado.deleteMany({ where: { itemId: { in: itens.map((i) => i.id) } } });
  await prisma.checklistItem.deleteMany({ where: { categoriaId } });
  await prisma.checklistCategoria.delete({ where: { id: categoriaId } });
  revalidatePath("/checklists");
}

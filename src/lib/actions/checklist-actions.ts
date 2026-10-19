"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function renameCategoriaAction(categoriaId: string, nome: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  if (!nome.trim()) return;
  await prisma.checklistCategoria.update({ where: { id: categoriaId }, data: { nome: nome.trim() } });
  revalidatePath("/checklists");
}

export async function updateItemAction(itemId: string, field: "texto" | "referencia", value: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  await prisma.checklistItem.update({ where: { id: itemId }, data: { [field]: value } });
  revalidatePath("/checklists");
}

// Item já decidido em alguma solicitação é arquivado, não apagado: a decisão e o apontamento
// fazem parte do histórico da análise. Sem decisões, sai de vez.
export async function deleteItemAction(itemId: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  if (await prisma.checklistResultado.count({ where: { itemId } })) {
    await prisma.checklistItem.update({ where: { id: itemId }, data: { arquivadoEm: new Date() } });
  } else {
    await prisma.checklistItem.delete({ where: { id: itemId } });
  }
  revalidatePath("/checklists");
}

export async function addItemAction(categoriaId: string, formData: FormData) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const texto = String(formData.get("texto") ?? "").trim();
  const referencia = String(formData.get("referencia") ?? "").trim();
  if (!texto) return;
  const count = await prisma.checklistItem.count({ where: { categoriaId, arquivadoEm: null } });
  await prisma.checklistItem.create({ data: { categoriaId, texto, referencia, ordem: count } });
  revalidatePath("/checklists");
}

export async function addCategoriaAction(empreendimentoId: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const count = await prisma.checklistCategoria.count({ where: { empreendimentoId, arquivadaEm: null } });
  await prisma.checklistCategoria.create({ data: { empreendimentoId, nome: "Nova categoria", ordem: count } });
  revalidatePath("/checklists");
}

// Mesma regra: com decisões registradas, a categoria é arquivada; sem, é apagada.
export async function deleteCategoriaAction(categoriaId: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  if (await prisma.checklistResultado.count({ where: { item: { categoriaId } } })) {
    await prisma.checklistCategoria.update({ where: { id: categoriaId }, data: { arquivadaEm: new Date() } });
  } else {
    await prisma.checklistItem.deleteMany({ where: { categoriaId } });
    await prisma.checklistCategoria.delete({ where: { id: categoriaId } });
  }
  revalidatePath("/checklists");
}

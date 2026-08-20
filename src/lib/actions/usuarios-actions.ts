"use server";

import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function aprovarVinculoAction(userId: string) {
  const session = await requireRole("CAPE_ANALISTA");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.vinculoLoteId) return;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { vinculoStatus: "APROVADO", vinculoRevisadoPorId: session.user.id, vinculoRevisadoEm: new Date() },
    }),
    prisma.lote.update({
      where: { id: user.vinculoLoteId },
      data: user.role === "RESPONSAVEL_TECNICO" ? { rtId: userId } : { proprietarioId: userId },
    }),
  ]);

  revalidatePath("/usuarios");
}

export async function recusarVinculoAction(userId: string) {
  const session = await requireRole("CAPE_ANALISTA");
  await prisma.user.update({
    where: { id: userId },
    data: { vinculoStatus: "RECUSADO", vinculoRevisadoPorId: session.user.id, vinculoRevisadoEm: new Date() },
  });
  revalidatePath("/usuarios");
}

const novoInternoSchema = z.object({
  perfil: z.enum(["CAPE_ANALISTA", "SINDICO"]),
  nome: z.string().min(3, "Informe o nome completo"),
  email: z.string().email("E-mail inválido"),
  registro: z.string().optional(),
});

export type NovoInternoState = { error?: string; ok?: boolean; senhaTemp?: string } | null;

export async function criarUsuarioInternoAction(_prev: NovoInternoState, formData: FormData): Promise<NovoInternoState> {
  await requireRole("CAPE_ANALISTA");
  const parsed = novoInternoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  if (d.perfil === "CAPE_ANALISTA" && !d.registro) {
    return { error: "Informe o registro CAU/CREA." };
  }

  const existing = await prisma.user.findFirst({ where: { email: d.email } });
  if (existing) return { error: "Já existe uma conta com este e-mail." };

  const senhaTemp = crypto.randomBytes(6).toString("base64url");
  const passwordHash = await bcrypt.hash(senhaTemp, 10);
  const cpfPlaceholder = `PEND-${crypto.randomUUID().slice(0, 12)}`;

  await prisma.user.create({
    data: {
      name: d.nome,
      email: d.email,
      cpf: cpfPlaceholder,
      birthDate: new Date("1990-01-01"),
      phone: "",
      passwordHash,
      role: d.perfil,
      creaCau: d.perfil === "CAPE_ANALISTA" ? d.registro : null,
    },
  });

  revalidatePath("/usuarios");
  return { ok: true, senhaTemp };
}

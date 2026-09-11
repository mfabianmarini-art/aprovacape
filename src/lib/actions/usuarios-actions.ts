"use server";

import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { UF_REGEX } from "@/lib/registro-profissional";

export async function aprovarVinculoAction(userId: string) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
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

  revalidatePath("/vinculos");
  revalidatePath("/empreendimentos");
}

export async function recusarVinculoAction(userId: string) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  await prisma.user.update({
    where: { id: userId },
    data: { vinculoStatus: "RECUSADO", vinculoRevisadoPorId: session.user.id, vinculoRevisadoEm: new Date() },
  });
  revalidatePath("/vinculos");
  revalidatePath("/empreendimentos");
}

const novoInternoSchema = z.object({
  perfil: z.enum(["ADMIN_CAPE", "CAPE_ANALISTA"]),
  nome: z.string().min(3, "Informe o nome completo"),
  email: z.string().email("E-mail inválido"),
  conselho: z.enum(["CREA", "CAU"]),
  registroNumero: z.string().trim().optional(),
  registroUf: z.string().trim().toUpperCase().optional(),
});

export type NovoInternoState = { error?: string; ok?: boolean; senhaTemp?: string } | null;

export async function criarUsuarioInternoAction(_prev: NovoInternoState, formData: FormData): Promise<NovoInternoState> {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const parsed = novoInternoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  // Só um Admin CAPE já existente pode criar outro Admin CAPE.
  if (d.perfil === "ADMIN_CAPE" && session.user.role !== "ADMIN_CAPE") {
    return { error: "Apenas um Admin CAPE pode criar outra conta de Admin CAPE." };
  }

  if (!d.registroNumero) return { error: "Informe o número do registro no conselho." };
  if (!UF_REGEX.test(d.registroUf ?? "")) return { error: "Informe a UF emissora do registro (ex.: SP)." };

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
      conselho: d.conselho,
      registroNumero: d.registroNumero,
      registroUf: d.registroUf,
    },
  });

  revalidatePath("/usuarios");
  return { ok: true, senhaTemp };
}

const novoSindicoSchema = z.object({
  nome: z.string().min(3, "Informe o nome completo"),
  email: z.string().email("E-mail inválido"),
});

// Cria o síndico já vinculado ao empreendimento — é esse vínculo que define o que ele enxerga.
export async function criarSindicoAction(
  empreendimentoId: string,
  _prev: NovoInternoState,
  formData: FormData,
): Promise<NovoInternoState> {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const parsed = novoSindicoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  const existing = await prisma.user.findFirst({ where: { email: d.email } });
  if (existing) return { error: "Já existe uma conta com este e-mail." };

  const senhaTemp = crypto.randomBytes(6).toString("base64url");
  const passwordHash = await bcrypt.hash(senhaTemp, 10);

  await prisma.$transaction(async (tx) => {
    const sindico = await tx.user.create({
      data: {
        name: d.nome,
        email: d.email,
        cpf: `PEND-${crypto.randomUUID().slice(0, 12)}`,
        birthDate: new Date("1990-01-01"),
        phone: "",
        passwordHash,
        role: "SINDICO",
      },
    });
    await tx.empreendimento.update({ where: { id: empreendimentoId }, data: { sindicoId: sindico.id } });
  });

  revalidatePath("/empreendimentos");
  return { ok: true, senhaTemp };
}

export async function vincularSindicoAction(empreendimentoId: string, formData: FormData) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sindicoId = formData.get("sindicoId");
  if (typeof sindicoId !== "string" || !sindicoId) return;

  const sindico = await prisma.user.findUnique({ where: { id: sindicoId } });
  if (sindico?.role !== "SINDICO") return;

  await prisma.empreendimento.update({ where: { id: empreendimentoId }, data: { sindicoId } });
  revalidatePath("/empreendimentos");
}

export async function desvincularSindicoAction(empreendimentoId: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  await prisma.empreendimento.update({ where: { id: empreendimentoId }, data: { sindicoId: null } });
  revalidatePath("/empreendimentos");
}

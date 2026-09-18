"use server";

import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { UF_REGEX } from "@/lib/registro-profissional";
import { divergenciaDeTitular } from "@/lib/conferencia-vinculo";
import { digitosCpf } from "@/lib/cpf";

export async function aprovarVinculoAction(userId: string) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.vinculoLoteId) return;

  const ehRT = user.role === "RESPONSAVEL_TECNICO";
  const lote = await prisma.lote.findUniqueOrThrow({
    where: { id: user.vinculoLoteId },
    include: {
      quadra: { select: { nome: true } },
      rt: { select: { id: true, name: true } },
      proprietario: { select: { id: true, name: true, cpf: true } },
    },
  });
  // Trava do servidor, não só do botão: quem pede não bate com o proprietário cadastrado
  // no lote, então não há como conferir o pedido. Resolver é decisão humana — recusar,
  // ou atualizar o cadastro do lote se o imóvel realmente mudou de dono.
  if (divergenciaDeTitular(lote, { ehRT, cpf: user.cpf, vinculoPropNome: user.vinculoPropNome, vinculoPropCpf: user.vinculoPropCpf }, user.name)) {
    return;
  }
  // O lote guarda um único RT e um único proprietário: aprovar sobre lote ocupado
  // substitui a pessoa que estava lá, e ela perde as ações sobre as solicitações em
  // curso. A troca fica no histórico do lote para não acontecer em silêncio.
  const anterior = ehRT ? lote.rt : lote.proprietario;
  const substitui = anterior && anterior.id !== userId ? anterior : null;
  const solicitacoesDoLote = substitui
    ? await prisma.solicitacao.findMany({
        where: { loteId: lote.id, status: { not: "RASCUNHO" } },
        select: { id: true },
      })
    : [];

  // Lote sem proprietário na matrícula: aprovar um proprietário é a primeira notícia
  // confiável de quem é o dono, então o cadastro passa a existir a partir daqui.
  const preencheTitular =
    !ehRT && !lote.titularCpf && digitosCpf(user.cpf).length === 11
      ? {
          titularNome: user.name,
          titularCpf: digitosCpf(user.cpf),
          titularAtualizadoEm: new Date(),
          titularAtualizadoPorId: session.user.id,
        }
      : {};

  const papel = ehRT ? "Responsável técnico" : "Proprietário";
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { vinculoStatus: "APROVADO", vinculoRevisadoPorId: session.user.id, vinculoRevisadoEm: new Date() },
    }),
    prisma.lote.update({
      where: { id: lote.id },
      data: ehRT ? { rtId: userId } : { proprietarioId: userId, ...preencheTitular },
    }),
    ...solicitacoesDoLote.map((s) =>
      prisma.historicoEvento.create({
        data: {
          solicitacaoId: s.id,
          tipo: "VINCULO_SUBSTITUIDO",
          texto: `${papel} do lote alterado pela CAPE: de ${substitui!.name} para ${user.name}. As ações desta solicitação passam para o novo responsável.`,
          cor: "#B4711A",
          autorId: session.user.id,
        },
      }),
    ),
  ]);

  revalidatePath("/vinculos");
  revalidatePath("/empreendimentos");
  revalidatePath("/requerimentos");
  revalidatePath("/resumo");
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

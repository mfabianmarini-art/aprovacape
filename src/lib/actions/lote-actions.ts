"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { cpfValido, digitosCpf } from "@/lib/cpf";
import { cnpjValido, normalizarCnpj } from "@/lib/cnpj";

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
    // Lote adicional de um projeto também conta: a solicitação o referencia.
    prisma.solicitacao.count({ where: { OR: [{ loteId }, { lotesAdicionais: { some: { loteId } } }] } }),
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

// Pessoa física: nome e CPF. Pessoa jurídica: razão social (no mesmo campo nome), CNPJ e o
// responsável legal, que é quem assina procurações pela empresa.
const titularSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("PF"),
    nome: z.string().trim().min(3, "Informe o nome do proprietário"),
    cpf: z.string().trim().transform(digitosCpf).refine(cpfValido, "CPF inválido"),
  }),
  z.object({
    tipo: z.literal("PJ"),
    nome: z.string().trim().min(3, "Informe a razão social"),
    cnpj: z.string().trim().transform(normalizarCnpj).refine(cnpjValido, "CNPJ inválido"),
    repNome: z.string().trim().min(3, "Informe o nome do responsável legal"),
    repCpf: z.string().trim().transform(digitosCpf).refine(cpfValido, "CPF do responsável legal inválido"),
  }),
]);

export type TitularState = { error?: string; ok?: boolean } | null;

// Proprietário conforme a matrícula. Venda do imóvel se resolve aqui, não como efeito
// colateral de aprovar um vínculo: a CAPE atualiza o cadastro com a matrícula nova em
// mãos, e é contra este dado que os pedidos de vínculo passam a ser conferidos.
export async function atualizarTitularLoteAction(
  loteId: string,
  _prev: TitularState,
  formData: FormData,
): Promise<TitularState> {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const parsed = titularSchema.safeParse({ tipo: "PF", ...Object.fromEntries(formData.entries()) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  // Grava só os campos do tipo escolhido: virar empresa apaga o CPF, e vice-versa.
  const dados =
    d.tipo === "PJ"
      ? { titularNome: d.nome, titularCpf: null, titularCnpj: d.cnpj, titularRepresentanteNome: d.repNome, titularRepresentanteCpf: d.repCpf }
      : { titularNome: d.nome, titularCpf: d.cpf, titularCnpj: null, titularRepresentanteNome: null, titularRepresentanteCpf: null };

  const lote = await prisma.lote.findUniqueOrThrow({
    where: { id: loteId },
    include: { quadra: { select: { nome: true } } },
  });
  if (
    lote.titularNome === dados.titularNome &&
    lote.titularCpf === dados.titularCpf &&
    lote.titularCnpj === dados.titularCnpj &&
    lote.titularRepresentanteNome === dados.titularRepresentanteNome &&
    lote.titularRepresentanteCpf === dados.titularRepresentanteCpf
  ) {
    return { ok: true };
  }

  // Troca de dono é fato do lote, e o lote não tem histórico próprio: o registro vai para
  // as solicitações vivas dele, que é onde alguém vai reparar.
  // Trocar só o responsável legal não muda o dono: a empresa continua a mesma.
  const documentoAnterior = lote.titularCnpj ?? lote.titularCpf;
  const trocouDePessoa = !!documentoAnterior && documentoAnterior !== (dados.titularCnpj ?? dados.titularCpf);
  const solicitacoes = trocouDePessoa
    ? await prisma.solicitacao.findMany({
        where: { loteId, status: { not: "RASCUNHO" } },
        select: { id: true },
      })
    : [];

  await prisma.$transaction([
    prisma.lote.update({
      where: { id: loteId },
      data: {
        ...dados,
        titularAtualizadoEm: new Date(),
        titularAtualizadoPorId: session.user.id,
      },
    }),
    ...solicitacoes.map((s) =>
      prisma.historicoEvento.create({
        data: {
          solicitacaoId: s.id,
          tipo: "TITULAR_ALTERADO",
          texto: `Proprietário do lote ${lote.quadra.nome} L${lote.numero} atualizado no cadastro pela CAPE: de ${lote.titularNome ?? "não informado"} para ${d.nome}.`,
          cor: "#B4711A",
          autorId: session.user.id,
        },
      }),
    ),
  ]);

  revalidatePath("/empreendimentos");
  revalidatePath("/vinculos");
  revalidatePath("/resumo");
  return { ok: true };
}

// Depois de uma venda, a conta do dono anterior continua vinculada ao lote e enxergando
// tudo dele. Desvincular é decisão explícita da CAPE, não efeito automático da correção
// do cadastro — uma correção de digitação não pode tirar o acesso de ninguém.
export async function desvincularContaLoteAction(loteId: string, papel: "proprietario" | "rt") {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  await prisma.lote.update({
    where: { id: loteId },
    data: papel === "rt" ? { rtId: null } : { proprietarioId: null },
  });
  revalidatePath("/empreendimentos");
  revalidatePath("/resumo");
  revalidatePath("/requerimentos");
}

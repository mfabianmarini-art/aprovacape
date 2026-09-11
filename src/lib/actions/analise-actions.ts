"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { DOC_ORDER } from "@/lib/status";
import type { DocumentoTipo } from "@/generated/prisma/enums";

async function loadSolicitacao(solicitacaoId: string) {
  return prisma.solicitacao.findUniqueOrThrow({
    where: { id: solicitacaoId },
    include: { documentos: true, lote: { include: { empreendimento: true } } },
  });
}

function revalidateAll(protocolo: string) {
  revalidatePath(`/analise/${protocolo}`);
  revalidatePath("/fila");
  revalidatePath("/resumo");
  revalidatePath("/requerimentos");
}

export async function toggleDocumentoAction(solicitacaoId: string, tipo: DocumentoTipo) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await loadSolicitacao(solicitacaoId);
  const doc = sol.documentos.find((d) => d.tipo === tipo);
  if (!doc) return;

  const validado = !doc.validado;
  await prisma.solicitacaoDocumento.update({
    where: { id: doc.id },
    // Validou: a pendência descrita deixou de existir, some com ela.
    data: { validado, observacao: validado ? null : doc.observacao },
  });

  const updated = await prisma.solicitacaoDocumento.findMany({ where: { solicitacaoId } });
  const allValidados = DOC_ORDER.every((t) => updated.find((d) => d.tipo === t)?.validado);
  await prisma.solicitacao.update({ where: { id: solicitacaoId }, data: { documentacaoValidada: allValidados } });

  revalidateAll(sol.protocolo);
}

const MAX_OBSERVACAO = 1000;

function normalizarObservacao(texto: string) {
  const limpo = texto.trim().slice(0, MAX_OBSERVACAO);
  return limpo.length > 0 ? limpo : null;
}

export async function salvarObservacaoDocumentoAction(solicitacaoId: string, tipo: DocumentoTipo, texto: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await loadSolicitacao(solicitacaoId);
  const doc = sol.documentos.find((d) => d.tipo === tipo);
  if (!doc) return;

  await prisma.solicitacaoDocumento.update({
    where: { id: doc.id },
    data: { observacao: normalizarObservacao(texto) },
  });
  revalidateAll(sol.protocolo);
}

export async function salvarObservacaoItemAction(solicitacaoId: string, itemId: string, texto: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await prisma.solicitacao.findUniqueOrThrow({ where: { id: solicitacaoId } });

  const existing = await prisma.checklistResultado.findUnique({
    where: { solicitacaoId_itemId: { solicitacaoId, itemId } },
  });
  if (!existing || existing.travado) return;

  await prisma.checklistResultado.update({
    where: { id: existing.id },
    data: { observacao: normalizarObservacao(texto) },
  });
  revalidateAll(sol.protocolo);
}

export async function devolverDocumentacaoAction(solicitacaoId: string) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await loadSolicitacao(solicitacaoId);
  const reenvios = sol.reenvios + 1;

  await prisma.$transaction([
    prisma.solicitacao.update({
      where: { id: solicitacaoId },
      data: {
        status: "COMPLEMENTO",
        reenvios,
        documentacaoValidada: false,
        pago: reenvios > sol.lote.empreendimento.reenviosSemTaxa ? false : sol.pago,
      },
    }),
    prisma.historicoEvento.create({
      data: {
        solicitacaoId,
        texto: "Documentação devolvida para complementação: um ou mais documentos inválidos ou ilegíveis.",
        cor: "#B4711A",
        autorId: session.user.id,
      },
    }),
  ]);

  revalidateAll(sol.protocolo);
}

export async function decidirItemAction(solicitacaoId: string, itemId: string, decisao: "APROVADO" | "REPROVADO") {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await prisma.solicitacao.findUniqueOrThrow({ where: { id: solicitacaoId } });

  const existing = await prisma.checklistResultado.findUnique({
    where: { solicitacaoId_itemId: { solicitacaoId, itemId } },
  });
  if (existing?.travado) return;

  await prisma.checklistResultado.upsert({
    where: { solicitacaoId_itemId: { solicitacaoId, itemId } },
    create: { solicitacaoId, itemId, status: decisao, avaliadoEm: new Date() },
    // Aprovar encerra a pendência; a observação que a descrevia não vale mais.
    update: { status: decisao, avaliadoEm: new Date(), ...(decisao === "APROVADO" && { observacao: null }) },
  });

  if (sol.status === "ENVIADA") {
    await prisma.solicitacao.update({ where: { id: solicitacaoId }, data: { status: "ANALISE" } });
  }

  revalidateAll(sol.protocolo);
}

export async function emitirParecerAction(solicitacaoId: string) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await prisma.solicitacao.findUniqueOrThrow({
    where: { id: solicitacaoId },
    include: { lote: { include: { empreendimento: true } }, resultados: true },
  });

  const categorias = await prisma.checklistCategoria.findMany({
    where: { empreendimentoId: sol.lote.empreendimentoId },
    include: { itens: true },
  });
  const totalItens = categorias.reduce((a, c) => a + c.itens.length, 0);
  if (sol.resultados.length < totalItens) return;

  const reprovados = sol.resultados.filter((r) => r.status === "REPROVADO");

  if (reprovados.length > 0) {
    const reenvios = sol.reenvios + 1;
    await prisma.$transaction([
      prisma.solicitacao.update({
        where: { id: solicitacaoId },
        data: { status: "COMPLEMENTO", reenvios, pago: reenvios > sol.lote.empreendimento.reenviosSemTaxa ? false : sol.pago },
      }),
      ...sol.resultados
        .filter((r) => r.status === "APROVADO")
        .map((r) => prisma.checklistResultado.update({ where: { id: r.id }, data: { travado: true } })),
      ...reprovados.map((r) => prisma.checklistResultado.update({ where: { id: r.id }, data: { status: "PENDENTE", travado: false } })),
      prisma.historicoEvento.create({
        data: {
          solicitacaoId,
          texto: `Devolvida com ${reprovados.length} pendência(s) no check-list técnico. Reenvio ${reenvios} de ${sol.lote.empreendimento.reenviosSemTaxa}.`,
          cor: "#B4711A",
          autorId: session.user.id,
        },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.solicitacao.update({ where: { id: solicitacaoId }, data: { status: "APROVADA" } }),
      prisma.historicoEvento.create({
        data: {
          solicitacaoId,
          texto: "Projeto aprovado. A aprovação da CAPE não substitui a aprovação da Prefeitura.",
          cor: "#24603A",
          autorId: session.user.id,
        },
      }),
    ]);
  }

  revalidateAll(sol.protocolo);
}

export async function togglePagoAction(solicitacaoId: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await prisma.solicitacao.findUniqueOrThrow({ where: { id: solicitacaoId } });
  await prisma.solicitacao.update({ where: { id: solicitacaoId }, data: { pago: !sol.pago } });
  revalidateAll(sol.protocolo);
}

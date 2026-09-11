"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { saveUploadedFile } from "@/lib/upload";
import { validarDocumento } from "@/lib/upload-documento";
import { DOC_ORDER } from "@/lib/status";
import type { DocumentoTipo } from "@/generated/prisma/enums";


const rascunhoSchema = z.object({
  loteId: z.string().min(1),
  tipo: z.enum(["OBRA_NOVA", "REFORMA", "AMPLIACAO", "DEMOLICAO", "MURO"]),
  areaConstruida: z.coerce.number().positive(),
  descricao: z.string().min(10, "Descreva a obra com mais detalhes"),
  // O gestor CAPE só cadastra a quadra e o número do lote — endereço e área do lote em si
  // (diferente da área construída da obra, acima) são preenchidos aqui pelo proprietário/RT.
  rua: z.string().trim().min(1, "Informe o endereço do lote"),
  areaLote: z.coerce.number().positive("Informe a área do lote"),
});

export async function criarRascunhoAction(_prev: unknown, formData: FormData) {
  const session = await requireRole("PROPRIETARIO", "RESPONSAVEL_TECNICO");
  const parsed = rascunhoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const lote = await prisma.lote.findUniqueOrThrow({ where: { id: parsed.data.loteId } });
  const isOwner = lote.proprietarioId === session.user.id || lote.rtId === session.user.id;
  if (!isOwner) return { error: "Este lote não está vinculado à sua conta." };

  const sol = await prisma.$transaction(async (tx) => {
    await tx.lote.update({
      where: { id: lote.id },
      data: { rua: parsed.data.rua, areaM2: parsed.data.areaLote },
    });
    return tx.solicitacao.create({
      data: {
        protocolo: `RASCUNHO-${Date.now()}`,
        loteId: lote.id,
        tipo: parsed.data.tipo,
        areaConstruida: parsed.data.areaConstruida,
        descricao: parsed.data.descricao,
        status: "RASCUNHO",
        prazoDias: 10,
        criadoPorId: session.user.id,
        responsavelTecnicoNome: "",
        responsavelTecnicoRegistro: "",
        responsavelTecnicoEmail: "",
      },
    });
  });

  redirect(`/nova?rascunho=${sol.id}&passo=2`);
}

export async function uploadDocumentoAction(solicitacaoId: string, tipo: DocumentoTipo, _prev: unknown, formData: FormData) {
  const session = await requireRole("PROPRIETARIO", "RESPONSAVEL_TECNICO");
  const sol = await prisma.solicitacao.findUniqueOrThrow({ where: { id: solicitacaoId }, include: { lote: true } });
  if (sol.lote.proprietarioId !== session.user.id && sol.lote.rtId !== session.user.id) {
    return { error: "Solicitação não pertence a este usuário." };
  }
  // COMPLEMENTO também aceita: é exatamente o momento de trocar o que foi apontado,
  // antes de reenviar para análise.
  if (sol.status !== "RASCUNHO" && sol.status !== "COMPLEMENTO") {
    return { error: "Esta solicitação está em análise e não aceita novos arquivos." };
  }

  // Em complementação troca-se só o que foi apontado — documento já validado pela CAPE
  // permanece. A exceção é a devolução no check-list, onde o projeto em si muda.
  if (sol.status === "COMPLEMENTO" && !sol.devolvidaNoChecklist) {
    const atual = await prisma.solicitacaoDocumento.findUnique({
      where: { solicitacaoId_tipo: { solicitacaoId, tipo } },
    });
    if (atual?.validado) return { error: "Este documento já foi validado pela CAPE e não precisa ser substituído." };
  }

  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione um arquivo." };
  const invalido = await validarDocumento(file, tipo);
  if (invalido) return { error: invalido };

  const saved = await saveUploadedFile(file, solicitacaoId);

  await prisma.solicitacaoDocumento.upsert({
    where: { solicitacaoId_tipo: { solicitacaoId, tipo } },
    create: { solicitacaoId, tipo, ...saved, validado: false },
    update: { ...saved, validado: false },
  });

  revalidatePath("/nova");
  revalidatePath("/requerimentos");
  return { error: undefined };
}

const enviarSchema = z.object({
  solicitacaoId: z.string().min(1),
  rtNome: z.string().min(3, "Informe o responsável técnico"),
  rtRegistro: z.string().min(3, "Informe o registro CAU/CREA"),
  rtEmail: z.string().email("E-mail inválido"),
  d1: z.literal("on"),
  d2: z.literal("on"),
  d3: z.literal("on"),
});

export async function enviarSolicitacaoAction(_prev: unknown, formData: FormData) {
  const session = await requireRole("PROPRIETARIO", "RESPONSAVEL_TECNICO");
  const parsed = enviarSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Preencha todos os campos e aceite as declarações." };

  const sol = await prisma.solicitacao.findUniqueOrThrow({
    where: { id: parsed.data.solicitacaoId },
    include: { lote: { include: { empreendimento: true } }, documentos: true },
  });
  if (sol.lote.proprietarioId !== session.user.id && sol.lote.rtId !== session.user.id) {
    return { error: "Solicitação não pertence a este usuário." };
  }
  if (sol.status !== "RASCUNHO") return { error: "Esta solicitação já foi enviada." };

  const faltando = DOC_ORDER.filter((t) => !sol.documentos.find((d) => d.tipo === t));
  if (faltando.length > 0) return { error: "Anexe todos os documentos do check-list antes de enviar." };

  const ano = new Date().getFullYear();
  const existentes = await prisma.solicitacao.findMany({
    where: { protocolo: { startsWith: `SOL-${ano}-` } },
    select: { protocolo: true },
  });
  const maiorNumero = existentes.reduce((max, s) => {
    const n = Number(s.protocolo.split("-").at(-1));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  const protocolo = `SOL-${ano}-${String(maiorNumero + 1).padStart(3, "0")}`;

  await prisma.$transaction([
    prisma.solicitacao.update({
      where: { id: sol.id },
      data: {
        protocolo,
        status: "ENVIADA",
        prazoDias: sol.lote.empreendimento.prazoDias,
        responsavelTecnicoNome: parsed.data.rtNome,
        responsavelTecnicoRegistro: parsed.data.rtRegistro,
        responsavelTecnicoEmail: parsed.data.rtEmail,
      },
    }),
    prisma.historicoEvento.create({
      data: {
        solicitacaoId: sol.id,
        texto: `Solicitação protocolada por ${session.user.name}.`,
        cor: "#8FB0BF",
        autorId: session.user.id,
      },
    }),
  ]);

  revalidatePath("/requerimentos");
  revalidatePath("/fila");
  revalidatePath("/resumo");
  redirect("/requerimentos");
}

export async function cancelarRascunhoAction(solicitacaoId: string) {
  const session = await requireRole("PROPRIETARIO", "RESPONSAVEL_TECNICO");
  const sol = await prisma.solicitacao.findUniqueOrThrow({ where: { id: solicitacaoId }, include: { lote: true } });
  if (sol.lote.proprietarioId !== session.user.id && sol.lote.rtId !== session.user.id) return;
  if (sol.status !== "RASCUNHO") return;

  await prisma.solicitacaoDocumento.deleteMany({ where: { solicitacaoId } });
  await prisma.solicitacao.delete({ where: { id: solicitacaoId } });
  redirect("/nova");
}

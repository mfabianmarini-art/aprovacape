"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { saveUploadedFile } from "@/lib/upload";

const MAX_BYTES = 20 * 1024 * 1024;
const TIPOS_ACEITOS = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const uploadSchema = z.object({
  titulo: z.string().trim().min(2, "Informe um título para o documento"),
  categoria: z.enum(["MANUAL_PROPRIETARIO", "CONVENCAO_CONDOMINIO", "REGULAMENTO", "OUTRO"]),
  descricao: z.string().trim().max(600, "Descrição muito longa (máx. 600 caracteres)").optional(),
});

export type DocumentoTecnicoState = { error?: string; ok?: boolean } | null;

// Equipe CAPE gerencia qualquer empreendimento; o síndico, só o que ele administra.
async function podeGerirDocumentos(role: string, userId: string, empreendimentoId: string) {
  if (role !== "SINDICO") return true;
  const emp = await prisma.empreendimento.findUnique({ where: { id: empreendimentoId } });
  return emp?.sindicoId === userId;
}

export async function uploadDocumentoTecnicoAction(
  empreendimentoId: string,
  _prev: DocumentoTecnicoState,
  formData: FormData,
): Promise<DocumentoTecnicoState> {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA", "SINDICO");
  if (!(await podeGerirDocumentos(session.user.role, session.user.id, empreendimentoId))) {
    return { error: "Este empreendimento não está sob sua gestão." };
  }

  const parsed = uploadSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione um arquivo." };
  if (!TIPOS_ACEITOS.has(file.type)) return { error: "Envie um PDF, Word (.doc/.docx) ou imagem (PNG/JPG/WEBP)." };
  if (file.size > MAX_BYTES) return { error: "Arquivo maior que 20 MB." };

  const saved = await saveUploadedFile(file, `tecnicos/${empreendimentoId}`);

  await prisma.documentoTecnico.create({
    data: {
      empreendimentoId,
      categoria: parsed.data.categoria,
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao || null,
      enviadoPorId: session.user.id,
      ...saved,
    },
  });

  revalidatePath("/documentos");
  revalidatePath("/empreendimentos");
  return { error: undefined, ok: true };
}

export async function deleteDocumentoTecnicoAction(documentoId: string) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA", "SINDICO");
  const doc = await prisma.documentoTecnico.findUniqueOrThrow({ where: { id: documentoId } });
  if (!(await podeGerirDocumentos(session.user.role, session.user.id, doc.empreendimentoId))) return;

  await prisma.documentoTecnico.delete({ where: { id: documentoId } });
  revalidatePath("/documentos");
  revalidatePath("/empreendimentos");
}

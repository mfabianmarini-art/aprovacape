"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { descartarArquivo, receberArquivo } from "@/lib/upload-direto";
import { marcarSubstituido, registrarArquivo } from "@/lib/arquivos";
import { podeGerirDocumentosTecnicos } from "@/lib/acesso-arquivos";

const uploadSchema = z.object({
  titulo: z.string().trim().min(2, "Informe um título para o documento"),
  categoria: z.enum(["MANUAL_PROPRIETARIO", "CONVENCAO_CONDOMINIO", "REGULAMENTO", "OUTRO"]),
  descricao: z.string().trim().max(600, "Descrição muito longa (máx. 600 caracteres)").optional(),
});

export type DocumentoTecnicoState = { error?: string; ok?: boolean } | null;

export async function uploadDocumentoTecnicoAction(
  empreendimentoId: string,
  _prev: DocumentoTecnicoState,
  formData: FormData,
): Promise<DocumentoTecnicoState> {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA", "SINDICO");
  // O arquivo já subiu direto ao Blob (até 20 MB, acima do limite de 4,5 MB de uma
  // requisição à Vercel); qualquer recusa o apaga.
  const pathname = String(formData.get("pathname") ?? "");
  const nomeArquivo = String(formData.get("nomeArquivo") ?? "").slice(0, 255);
  const recusar = async (error: string) => {
    if (pathname) await descartarArquivo(pathname);
    return { error };
  };
  if (!(await podeGerirDocumentosTecnicos(session.user, empreendimentoId))) {
    return recusar("Este empreendimento não está sob sua gestão.");
  }

  const parsed = uploadSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return recusar(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  if (!pathname) return { error: "Selecione um arquivo." };

  const recebido = await receberArquivo(pathname, nomeArquivo, { destino: "tecnico", empreendimentoId });
  if ("erro" in recebido) return { error: recebido.erro };
  const saved = { caminhoArquivo: pathname, nomeArquivo, tamanhoBytes: recebido.tamanho };

  await prisma.$transaction([
    prisma.documentoTecnico.create({
      data: {
        empreendimentoId,
        categoria: parsed.data.categoria,
        titulo: parsed.data.titulo,
        descricao: parsed.data.descricao || null,
        enviadoPorId: session.user.id,
        ...saved,
      },
    }),
    registrarArquivo({
      caminho: pathname,
      nome: nomeArquivo,
      tamanho: recebido.tamanho,
      hash: String(formData.get("hash") ?? ""),
      categoria: "DOCUMENTO_TECNICO",
      empreendimentoId,
      enviadoPorId: session.user.id,
    }),
  ]);

  revalidatePath("/documentos");
  revalidatePath("/empreendimentos");
  return { error: undefined, ok: true };
}

export async function deleteDocumentoTecnicoAction(documentoId: string) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA", "SINDICO");
  const doc = await prisma.documentoTecnico.findUniqueOrThrow({ where: { id: documentoId } });
  if (!(await podeGerirDocumentosTecnicos(session.user, doc.empreendimentoId))) return;

  // Sai da lista, mas o arquivo segue guardado no inventário (guarda contratual de toda a
  // documentação até 30 dias após a rescisão).
  await prisma.$transaction([prisma.documentoTecnico.delete({ where: { id: documentoId } }), marcarSubstituido(doc.caminhoArquivo)]);
  revalidatePath("/documentos");
  revalidatePath("/empreendimentos");
}

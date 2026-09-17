"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { saveUploadedFile } from "@/lib/upload";
import { autorizacaoInvalida } from "@/lib/vinculo-comprovacao";

const schema = z.object({
  loteId: z.string().min(1, "Selecione o lote"),
  comprovacao: z.string().trim().optional(),
});

export type VinculoState = { error?: string; ok?: boolean } | null;

// Usuário já cadastrado pedindo vínculo com outro lote. Reaproveita o slot vinculo* do
// User — por isso um pedido por vez — e a aprovação segue o mesmo caminho do auto-cadastro
// (aprovarVinculoAction). Nada é perdido: os lotes já aprovados vivem em Lote.proprietarioId/rtId.
export async function solicitarVinculoAction(_prev: VinculoState, formData: FormData): Promise<VinculoState> {
  const session = await requireRole("PROPRIETARIO", "RESPONSAVEL_TECNICO");
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  const ehRT = session.user.role === "RESPONSAVEL_TECNICO";

  const [user, lote] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      include: { vinculoLote: { include: { quadra: true } } },
    }),
    prisma.lote.findUnique({ where: { id: d.loteId }, include: { quadra: true } }),
  ]);
  if (!lote) return { error: "Lote não encontrado." };

  if (user.vinculoStatus === "PENDENTE") {
    const atual = user.vinculoLote;
    return {
      error: `Você já tem um pedido de vínculo em análise${atual ? ` (${atual.quadra.nome} L${atual.numero})` : ""}. Aguarde a resposta da CAPE antes de pedir outro.`,
    };
  }
  if ((ehRT ? lote.rtId : lote.proprietarioId) === user.id) {
    return { error: `${lote.quadra.nome} L${lote.numero} já está vinculado à sua conta.` };
  }

  let autorizacao: Awaited<ReturnType<typeof saveUploadedFile>> | null = null;
  if (ehRT) {
    const file = formData.get("autorizacao");
    if (!(file instanceof File) || file.size === 0) return { error: "Anexe a autorização do proprietário." };
    const invalido = autorizacaoInvalida(file);
    if (invalido) return { error: invalido };
    autorizacao = await saveUploadedFile(file, "vinculos");
  } else if (!d.comprovacao) {
    return { error: "Informe a matrícula do lote ou o código de convite." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      vinculoStatus: "PENDENTE",
      vinculoLoteId: lote.id,
      vinculoSolicitadoEm: new Date(),
      vinculoComprovacao: ehRT ? null : d.comprovacao,
      vinculoArquivoNome: autorizacao?.nomeArquivo ?? null,
      vinculoArquivoCaminho: autorizacao?.caminhoArquivo ?? null,
      vinculoArquivoTamanho: autorizacao?.tamanhoBytes ?? null,
      // A revisão gravada era do pedido anterior.
      vinculoRevisadoPorId: null,
      vinculoRevisadoEm: null,
    },
  });

  revalidatePath("/vinculo");
  revalidatePath("/vinculos");
  revalidatePath("/requerimentos");
  revalidatePath("/nova");
  revalidatePath("/empreendimentos");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { descartarArquivo, receberArquivo } from "@/lib/upload-direto";
import { marcarSubstituido, registrarArquivo } from "@/lib/arquivos";

import {
  camposProprietarioDeclarado,
  proprietarioDeclaradoInvalido,
  dadosProprietarioParaGravar,
} from "@/lib/proprietario-declarado";

const schema = z.object({
  loteId: z.string().min(1, "Selecione o lote"),
  comprovacao: z.string().trim().optional(),
  ...camposProprietarioDeclarado,
});

export type VinculoState = { error?: string; ok?: boolean } | null;

// Usuário já cadastrado pedindo vínculo com outro lote. Reaproveita o slot vinculo* do
// User — por isso um pedido por vez — e a aprovação segue o mesmo caminho do auto-cadastro
// (aprovarVinculoAction). Nada é perdido: os lotes já aprovados vivem em Lote.proprietarioId/rtId.
export async function solicitarVinculoAction(_prev: VinculoState, formData: FormData): Promise<VinculoState> {
  const session = await requireRole("RESPONSAVEL_TECNICO");
  // A autorização já subiu direto ao Blob; qualquer recusa daqui em diante a apaga.
  const pathname = String(formData.get("pathname") ?? "");
  const nomeArquivo = String(formData.get("nomeArquivo") ?? "").slice(0, 255);
  const recusar = async (error: string): Promise<VinculoState> => {
    if (pathname) await descartarArquivo(pathname);
    return { error };
  };
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return recusar(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const d = parsed.data;
  const ehRT = session.user.role === "RESPONSAVEL_TECNICO";

  const [user, lote] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      include: { vinculoLote: { include: { quadra: true } } },
    }),
    prisma.lote.findUnique({ where: { id: d.loteId }, include: { quadra: true } }),
  ]);
  if (!lote) return recusar("Lote não encontrado.");

  if (user.vinculoStatus === "PENDENTE") {
    const atual = user.vinculoLote;
    return recusar(
      `Você já tem um pedido de vínculo em análise${atual ? ` (${atual.quadra.nome} L${atual.numero})` : ""}. Aguarde a resposta da CAPE antes de pedir outro.`,
    );
  }
  if ((ehRT ? lote.rtId : lote.proprietarioId) === user.id) {
    return recusar(`${lote.quadra.nome} L${lote.numero} já está vinculado à sua conta.`);
  }

  let autorizacao: { nomeArquivo: string; caminhoArquivo: string; tamanhoBytes: number } | null = null;
  if (ehRT) {
    const semProprietario = proprietarioDeclaradoInvalido(d);
    if (semProprietario) return recusar(semProprietario);
    if (!pathname) return { error: "Anexe a autorização do proprietário." };
    const recebido = await receberArquivo(pathname, nomeArquivo, { destino: "vinculo", usuarioId: user.id });
    if ("erro" in recebido) return { error: recebido.erro };
    autorizacao = { nomeArquivo, caminhoArquivo: pathname, tamanhoBytes: recebido.tamanho };
  } else if (!d.comprovacao) {
    return recusar("Informe a matrícula do lote.");
  }

  // A autorização de um pedido anterior não é apagada: fica no inventário como versão
  // substituída.
  await prisma.$transaction([
    ...(autorizacao
      ? [
          marcarSubstituido(user.vinculoArquivoCaminho),
          registrarArquivo({
            caminho: autorizacao.caminhoArquivo,
            nome: autorizacao.nomeArquivo,
            tamanho: autorizacao.tamanhoBytes,
            hash: String(formData.get("hash") ?? ""),
            categoria: "VINCULO",
            usuarioId: user.id,
            empreendimentoId: lote.empreendimentoId,
            enviadoPorId: user.id,
          }),
        ]
      : []),
    prisma.user.update({
      where: { id: user.id },
      data: {
        vinculoStatus: "PENDENTE",
        vinculoLoteId: lote.id,
        vinculoSolicitadoEm: new Date(),
        vinculoComprovacao: ehRT ? null : d.comprovacao,
        vinculoArquivoNome: autorizacao?.nomeArquivo ?? null,
        vinculoArquivoCaminho: autorizacao?.caminhoArquivo ?? null,
        vinculoArquivoTamanho: autorizacao?.tamanhoBytes ?? null,
        ...dadosProprietarioParaGravar(d, ehRT),
        // A revisão gravada era do pedido anterior.
        vinculoRevisadoPorId: null,
        vinculoRevisadoEm: null,
      },
    }),
  ]);

  revalidatePath("/vinculo");
  revalidatePath("/vinculos");
  revalidatePath("/requerimentos");
  revalidatePath("/nova");
  revalidatePath("/empreendimentos");
  return { ok: true };
}

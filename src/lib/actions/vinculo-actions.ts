"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { descartarArquivo, receberArquivo } from "@/lib/upload-direto";
import { marcarSubstituido, registrarArquivo } from "@/lib/arquivos";
import { notificarVinculo } from "@/lib/email-vinculo";

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
// Arquivos que o RT anexa ao pedir vínculo, na ordem do formulário. `campo` é o prefixo dos
// campos que o navegador manda depois do upload direto (…Pathname, …Nome, …Hash).
const ARQUIVOS_DO_PEDIDO = [
  { campo: "procuracao", rotulo: "a procuração do proprietário", rotuloCurto: "Procuração do proprietário" },
  { campo: "docProprietario", rotulo: "o RG ou a CNH do proprietário", rotuloCurto: "RG ou CNH do proprietário" },
  { campo: "docRT", rotulo: "o seu RG ou CNH", rotuloCurto: "RG ou CNH do responsável técnico" },
] as const;

export async function solicitarVinculoAction(_prev: VinculoState, formData: FormData): Promise<VinculoState> {
  const session = await requireRole("RESPONSAVEL_TECNICO");
  // Os arquivos já subiram direto ao Blob; qualquer recusa daqui em diante apaga todos.
  const arquivos = ARQUIVOS_DO_PEDIDO.map((a) => ({
    ...a,
    pathname: String(formData.get(`${a.campo}Pathname`) ?? ""),
    nome: String(formData.get(`${a.campo}Nome`) ?? "").slice(0, 255),
    hash: String(formData.get(`${a.campo}Hash`) ?? ""),
  }));
  const recusar = async (error: string): Promise<VinculoState> => {
    await Promise.all(arquivos.filter((a) => a.pathname).map((a) => descartarArquivo(a.pathname)));
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

  const recebidos: ((typeof arquivos)[number] & { tamanho: number })[] = [];
  if (ehRT) {
    const semProprietario = proprietarioDeclaradoInvalido(d);
    if (semProprietario) return recusar(semProprietario);
    const faltando = arquivos.find((a) => !a.pathname);
    if (faltando) return recusar(`Anexe ${faltando.rotulo}.`);
    for (const a of arquivos) {
      const r = await receberArquivo(a.pathname, a.nome, { destino: "vinculo", usuarioId: user.id });
      if ("erro" in r) return recusar(`${a.rotuloCurto}: ${r.erro}`);
      recebidos.push({ ...a, tamanho: r.tamanho });
    }
  } else if (!d.comprovacao) {
    return recusar("Informe a matrícula do lote.");
  }
  const [procuracao, docProp, docRt] = recebidos;

  // Os arquivos de um pedido anterior não são apagados: ficam no inventário como versões
  // substituídas.
  await prisma.$transaction([
    ...(ehRT
      ? [
          marcarSubstituido(user.vinculoArquivoCaminho),
          marcarSubstituido(user.vinculoDocPropCaminho),
          marcarSubstituido(user.vinculoDocRtCaminho),
          ...recebidos.map((a) =>
            registrarArquivo({
              caminho: a.pathname,
              nome: a.nome,
              tamanho: a.tamanho,
              hash: a.hash,
              categoria: "VINCULO",
              usuarioId: user.id,
              empreendimentoId: lote.empreendimentoId,
              enviadoPorId: user.id,
            }),
          ),
        ]
      : []),
    prisma.user.update({
      where: { id: user.id },
      data: {
        vinculoStatus: "PENDENTE",
        vinculoLoteId: lote.id,
        vinculoSolicitadoEm: new Date(),
        vinculoComprovacao: ehRT ? null : d.comprovacao,
        vinculoArquivoNome: procuracao?.nome ?? null,
        vinculoArquivoCaminho: procuracao?.pathname ?? null,
        vinculoArquivoTamanho: procuracao?.tamanho ?? null,
        vinculoDocPropNome: docProp?.nome ?? null,
        vinculoDocPropCaminho: docProp?.pathname ?? null,
        vinculoDocPropTamanho: docProp?.tamanho ?? null,
        vinculoDocRtNome: docRt?.nome ?? null,
        vinculoDocRtCaminho: docRt?.pathname ?? null,
        vinculoDocRtTamanho: docRt?.tamanho ?? null,
        ...dadosProprietarioParaGravar(d, ehRT),
        // A revisão gravada era do pedido anterior.
        vinculoRevisadoPorId: null,
        vinculoRevisadoEm: null,
        vinculoMotivoRecusa: null,
      },
    }),
  ]);
  await notificarVinculo(user.id, { tipo: "SOLICITADO" });

  revalidatePath("/vinculo");
  revalidatePath("/vinculos");
  revalidatePath("/requerimentos");
  revalidatePath("/nova");
  revalidatePath("/empreendimentos");
  return { ok: true };
}

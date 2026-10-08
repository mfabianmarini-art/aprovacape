"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { receberArquivo } from "@/lib/upload-direto";
import { fimDaGuarda } from "@/lib/contrato";
import { marcarSubstituido, registrarArquivo } from "@/lib/arquivos";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

// Valores de taxa (taxaAnaliseCent/taxaVisitaCent) saíram de todas as telas: as colunas
// ficam no banco com o que já estava gravado, mas nenhum formulário as edita mais.
const schema = z.object({
  empreendimentoId: z.string().min(1),
  prazoDias: z.coerce.number().int().positive(),
  reenviosSemTaxa: z.coerce.number().int().nonnegative(),
});

const createSchema = z.object({
  nome: z.string().min(2, "Informe o nome do empreendimento"),
  cidade: z.string().min(2, "Informe a cidade"),
  uf: z.string().length(2, "Use a sigla da UF (ex.: SP)"),
  prazoDias: z.coerce.number().int().positive(),
});

// Uma quadra por linha do formulário: nome livre (A, B, A1, F2…) + quantidade de lotes,
// que varia livremente de quadra para quadra.
const quadraRowSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome de cada quadra"),
  totalLotes: z.coerce.number().int().positive("Informe a quantidade de lotes de cada quadra"),
});

function parseQuadraRows(formData: FormData): { error: string } | { quadras: { nome: string; totalLotes: number }[] } {
  const nomes = formData.getAll("quadraNome").map(String);
  const totais = formData.getAll("quadraLotes").map(String);
  const linhas = nomes
    .map((nome, i) => ({ nome, totalLotes: totais[i] }))
    .filter((l) => l.nome.trim() !== "" || l.totalLotes.trim() !== "");

  if (linhas.length === 0) return { error: "Adicione ao menos uma quadra." };

  const quadras: { nome: string; totalLotes: number }[] = [];
  for (const linha of linhas) {
    const row = quadraRowSchema.safeParse(linha);
    if (!row.success) return { error: row.error.issues[0]?.message ?? "Dados de quadra inválidos." };
    quadras.push(row.data);
  }

  const nomesUnicos = new Set(quadras.map((q) => q.nome));
  if (nomesUnicos.size !== quadras.length) return { error: "Os nomes das quadras não podem se repetir." };

  return { quadras };
}

export type CreateEmpreendimentoState = { error?: string } | null;

// Só Admin CAPE cria novos empreendimentos — analistas comuns apenas editam os já existentes.
export async function createEmpreendimentoAction(
  _prev: CreateEmpreendimentoState,
  formData: FormData,
): Promise<CreateEmpreendimentoState> {
  await requireRole("ADMIN_CAPE");
  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  const quadrasResult = parseQuadraRows(formData);
  if ("error" in quadrasResult) return { error: quadrasResult.error };

  const emp = await prisma.empreendimento.create({
    data: {
      nome: d.nome,
      cidade: d.cidade,
      uf: d.uf.toUpperCase(),
      numQuadras: quadrasResult.quadras.length,
      taxaAnaliseCent: 0,
      prazoDias: d.prazoDias,
      quadras: { create: quadrasResult.quadras },
    },
  });

  revalidatePath("/empreendimentos");
  redirect(`/empreendimentos?emp=${emp.id}`);
}

export async function updateEmpreendimentoAction(_prev: unknown, formData: FormData) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  await prisma.empreendimento.update({
    where: { id: d.empreendimentoId },
    data: {
      prazoDias: d.prazoDias,
      reenviosSemTaxa: d.reenviosSemTaxa,
    },
  });

  revalidatePath("/empreendimentos");
  return { error: undefined, ok: true };
}

// Quadras são cadastradas e mantidas separadamente do formulário geral do empreendimento,
// já que a quantidade e os nomes variam livremente (A, B, A1, F2…) empreendimento a empreendimento.
export type QuadraState = { error?: string; ok?: boolean } | null;

export async function addQuadraAction(empreendimentoId: string, _prev: QuadraState, formData: FormData): Promise<QuadraState> {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const parsed = quadraRowSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const existente = await prisma.quadra.findFirst({ where: { empreendimentoId, nome: parsed.data.nome } });
  if (existente) return { error: "Já existe uma quadra com esse nome neste empreendimento." };

  await prisma.$transaction([
    prisma.quadra.create({ data: { empreendimentoId, nome: parsed.data.nome, totalLotes: parsed.data.totalLotes } }),
    prisma.empreendimento.update({ where: { id: empreendimentoId }, data: { numQuadras: { increment: 1 } } }),
  ]);

  revalidatePath("/empreendimentos");
  revalidatePath("/resumo");
  return { error: undefined, ok: true };
}

export async function updateQuadraAction(quadraId: string, field: "nome" | "totalLotes", value: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  if (field === "nome") {
    const nome = value.trim();
    if (!nome) return;
    await prisma.quadra.update({ where: { id: quadraId }, data: { nome } });
  } else {
    const totalLotes = Math.round(Number(value));
    if (!Number.isFinite(totalLotes) || totalLotes <= 0) return;
    await prisma.quadra.update({ where: { id: quadraId }, data: { totalLotes } });
  }
  revalidatePath("/empreendimentos");
  revalidatePath("/resumo");
}

export async function deleteQuadraAction(quadraId: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const quadra = await prisma.quadra.findUniqueOrThrow({ where: { id: quadraId } });
  const lotesExistentes = await prisma.lote.count({ where: { quadraId } });
  if (lotesExistentes > 0) return; // quadra com lotes já cadastrados não pode ser removida por aqui

  await prisma.$transaction([
    prisma.quadra.delete({ where: { id: quadraId } }),
    prisma.empreendimento.update({ where: { id: quadra.empreendimentoId }, data: { numQuadras: { decrement: 1 } } }),
  ]);

  revalidatePath("/empreendimentos");
  revalidatePath("/resumo");
}

export async function uploadPlantaAction(empreendimentoId: string, _prev: unknown, formData: FormData) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  // A imagem já subiu direto ao Blob (reduzida a até 4096 px no navegador). Só bitmap —
  // PNG, JPG, WEBP, conferidos pelo conteúdo: SVG carrega script, e a planta é servida
  // pela origem do app.
  const pathname = String(formData.get("pathname") ?? "");
  const nomeArquivo = String(formData.get("nomeArquivo") ?? "").slice(0, 255);
  if (!pathname) return { error: "Selecione uma imagem." };
  const recebido = await receberArquivo(pathname, nomeArquivo, { destino: "planta", empreendimentoId });
  if ("erro" in recebido) return { error: recebido.erro };

  const emp = await prisma.empreendimento.findUniqueOrThrow({ where: { id: empreendimentoId }, select: { plantaImageUrl: true } });
  const anterior = emp.plantaImageUrl?.startsWith("/api/plantas/") ? `plantas/${emp.plantaImageUrl.slice("/api/plantas/".length)}` : null;

  // A planta anterior fica guardada no inventário como versão substituída.
  await prisma.$transaction([
    prisma.empreendimento.update({ where: { id: empreendimentoId }, data: { plantaImageUrl: `/api/${pathname}` } }),
    marcarSubstituido(anterior),
    registrarArquivo({
      caminho: pathname,
      nome: nomeArquivo,
      tamanho: recebido.tamanho,
      hash: String(formData.get("hash") ?? ""),
      categoria: "PLANTA",
      empreendimentoId,
      enviadoPorId: session.user.id,
    }),
  ]);

  revalidatePath("/empreendimentos");
  revalidatePath("/resumo");
  return { error: undefined, ok: true };
}

export type ContratoState = { error?: string; ok?: string } | null;

// Cláusula contratual: toda a documentação fica disponível ao condomínio até 30 dias após
// a rescisão. Registrar a rescisão não apaga nada; só marca a data a partir da qual o
// prazo corre.
export async function registrarRescisaoAction(empreendimentoId: string, _prev: ContratoState, formData: FormData): Promise<ContratoState> {
  await requireRole("ADMIN_CAPE");
  const texto = String(formData.get("data") ?? "").trim();
  if (!texto) {
    await prisma.empreendimento.update({ where: { id: empreendimentoId }, data: { contratoRescindidoEm: null } });
    revalidatePath("/empreendimentos");
    return { ok: "Rescisão removida: contrato vigente." };
  }
  const data = new Date(`${texto}T12:00:00-03:00`);
  if (Number.isNaN(data.getTime())) return { error: "Data inválida." };
  await prisma.empreendimento.update({ where: { id: empreendimentoId }, data: { contratoRescindidoEm: data } });
  revalidatePath("/empreendimentos");
  return { ok: "Rescisão registrada." };
}

// Só depois do prazo contratual, só pelo admin e com o nome do empreendimento digitado:
// apaga do Blob todos os arquivos do empreendimento. As linhas do inventário ficam (com
// excluidoEm) como registro do que existiu; os downloads passam a responder 410.
export async function excluirArquivosAposRescisaoAction(empreendimentoId: string, _prev: ContratoState, formData: FormData): Promise<ContratoState> {
  const session = await requireRole("ADMIN_CAPE");
  const emp = await prisma.empreendimento.findUniqueOrThrow({ where: { id: empreendimentoId } });
  const liberado = emp.contratoRescindidoEm && Date.now() > fimDaGuarda(emp.contratoRescindidoEm).getTime();
  if (!liberado) return { error: "A documentação ainda está no prazo contratual de guarda." };
  if (String(formData.get("confirmacao") ?? "").trim() !== emp.nome) return { error: "Digite o nome do empreendimento exatamente como aparece para confirmar." };

  const arquivos = await prisma.arquivo.findMany({ where: { empreendimentoId, excluidoEm: null }, select: { id: true, caminho: true } });
  for (let i = 0; i < arquivos.length; i += 100) {
    const lote = arquivos.slice(i, i + 100);
    await del(lote.map((a) => a.caminho));
    await prisma.arquivo.updateMany({ where: { id: { in: lote.map((a) => a.id) } }, data: { excluidoEm: new Date() } });
  }
  await prisma.empreendimento.update({ where: { id: empreendimentoId }, data: { arquivosExcluidosEm: new Date() } });
  console.log(JSON.stringify({ evento: "arquivos_excluidos_pos_rescisao", empreendimentoId, quantidade: arquivos.length, por: session.user.id }));
  revalidatePath("/empreendimentos");
  return { ok: `${arquivos.length} arquivo(s) excluídos.` };
}

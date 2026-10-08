"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/require-role";
import { validarDocumentoEnviado } from "@/lib/upload-documento";
import { descartarArquivo, lerArquivoEnviado } from "@/lib/upload-direto";
import { DOC_ORDER } from "@/lib/status";
import { emitirAcessoProprietario } from "@/lib/acesso-proprietario";
import type { DocumentoTipo } from "@/generated/prisma/enums";

// Só o responsável técnico abre e movimenta solicitações. O proprietário acompanha, sem
// agir: em /acompanhar com protocolo e senha, ou — se tiver conta antiga — em modo leitura.
const RT = "RESPONSAVEL_TECNICO" as const;

const rascunhoSchema = z.object({
  loteId: z.string().min(1),
  tipo: z.enum(["OBRA_NOVA", "REFORMA", "AMPLIACAO", "DEMOLICAO", "MURO", "PAISAGISMO"]),
  areaIntervencao: z.coerce.number().positive(),
  descricao: z.string().min(10, "Descreva a obra com mais detalhes"),
  proprietarioEmail: z.string().trim().toLowerCase().email("Informe um e-mail válido do proprietário"),
});

export async function criarRascunhoAction(_prev: unknown, formData: FormData) {
  const session = await requireRole(RT);
  const parsed = rascunhoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const lote = await prisma.lote.findUniqueOrThrow({ where: { id: parsed.data.loteId } });
  if (lote.rtId !== session.user.id) return { error: "Este lote não está vinculado à sua conta." };

  const sol = await prisma.solicitacao.create({
    data: {
      protocolo: `RASCUNHO-${Date.now()}`,
      loteId: lote.id,
      tipo: parsed.data.tipo,
      areaIntervencao: parsed.data.areaIntervencao,
      descricao: parsed.data.descricao,
      proprietarioEmail: parsed.data.proprietarioEmail,
      status: "RASCUNHO",
      prazoDias: 10,
      criadoPorId: session.user.id,
      responsavelTecnicoNome: "",
      responsavelTecnicoRegistro: "",
      responsavelTecnicoEmail: "",
    },
  });

  redirect(`/nova?rascunho=${sol.id}&passo=2`);
}

export async function uploadDocumentoAction(solicitacaoId: string, tipo: DocumentoTipo, _prev: unknown, formData: FormData) {
  const session = await requireRole(RT);
  const sol = await prisma.solicitacao.findUniqueOrThrow({ where: { id: solicitacaoId }, include: { lote: true } });
  if (sol.lote.rtId !== session.user.id) return { error: "Solicitação não pertence a este usuário." };
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

  // O arquivo já está no Blob (enviado direto pelo navegador, ver upload-cliente.ts);
  // aqui ele é conferido e só então registrado. Recusado, é apagado.
  const pathname = String(formData.get("pathname") ?? "");
  const nomeArquivo = String(formData.get("nomeArquivo") ?? "").slice(0, 255);
  const destino = { destino: "documento", solicitacaoId, tipo } as const;
  const arq = pathname && nomeArquivo ? await lerArquivoEnviado(pathname, destino) : null;
  if (!arq) return { error: "Arquivo não encontrado. Envie de novo." };
  const invalido = validarDocumentoEnviado({ nome: nomeArquivo, tamanho: arq.tamanho, inicio: arq.inicio }, tipo);
  if (invalido) {
    await descartarArquivo(pathname);
    return { error: invalido };
  }
  const saved = { caminhoArquivo: pathname, nomeArquivo, tamanhoBytes: arq.tamanho };

  await prisma.solicitacaoDocumento.upsert({
    where: { solicitacaoId_tipo: { solicitacaoId, tipo } },
    create: { solicitacaoId, tipo, ...saved, validado: false },
    // uploadedAt não é @updatedAt: sem isto a data continuaria a do primeiro envio, e o
    // analista não veria qual arquivo é novo nesta rodada.
    update: { ...saved, validado: false, uploadedAt: new Date() },
  });

  revalidatePath("/nova");
  revalidatePath("/requerimentos");
  return { error: undefined };
}

const enviarSchema = z.object({
  solicitacaoId: z.string().min(1),
  rtNome: z.string().min(3, "Informe o responsável técnico pelo projeto"),
  rtRegistro: z.string().min(3, "Informe o registro CAU/CREA do responsável técnico pelo projeto"),
  rtEmail: z.string().email("E-mail inválido para o responsável técnico pelo projeto"),
  rtExecNome: z.string().min(3, "Informe o responsável técnico pela execução"),
  rtExecRegistro: z.string().min(3, "Informe o registro CAU/CREA do responsável técnico pela execução"),
  rtExecEmail: z.string().email("E-mail inválido para o responsável técnico pela execução"),
  // Só para rascunhos criados antes de o e-mail ser pedido no passo 1.
  proprietarioEmail: z.string().trim().toLowerCase().email("Informe um e-mail válido do proprietário").optional(),
  d1: z.literal("on"),
  d2: z.literal("on"),
  d3: z.literal("on"),
});

export async function enviarSolicitacaoAction(_prev: unknown, formData: FormData) {
  const session = await requireRole(RT);
  const parsed = enviarSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Preencha todos os campos e aceite as declarações." };

  const sol = await prisma.solicitacao.findUniqueOrThrow({
    where: { id: parsed.data.solicitacaoId },
    include: { lote: { include: { empreendimento: true } }, documentos: true },
  });
  if (sol.lote.rtId !== session.user.id) return { error: "Solicitação não pertence a este usuário." };
  if (sol.status !== "RASCUNHO") return { error: "Esta solicitação já foi enviada." };

  const faltando = DOC_ORDER.filter((t) => !sol.documentos.find((d) => d.tipo === t));
  if (faltando.length > 0) return { error: "Anexe todos os documentos do check-list antes de enviar." };
  const proprietarioEmail = sol.proprietarioEmail ?? parsed.data.proprietarioEmail;
  if (!proprietarioEmail) return { error: "Informe o e-mail do proprietário." };

  // "Maior número + 1": dois envios no mesmo instante calculam o mesmo número, e o índice
  // único de protocolo recusa o segundo. Em vez de erro, recalcula — o número do outro já
  // está gravado — e tenta de novo.
  const ano = new Date().getFullYear();
  let protocolo = "";
  for (let tentativa = 0; ; tentativa++) {
    const existentes = await prisma.solicitacao.findMany({
      where: { protocolo: { startsWith: `SOL-${ano}-` } },
      select: { protocolo: true },
    });
    const maiorNumero = existentes.reduce((max, s) => {
      const n = Number(s.protocolo.split("-").at(-1));
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    protocolo = `SOL-${ano}-${String(maiorNumero + 1).padStart(3, "0")}`;
    try {
      await prisma.$transaction([
        // Só sai de RASCUNHO uma vez: um duplo clique não protocola o mesmo pedido duas vezes.
        prisma.solicitacao.update({
          where: { id: sol.id, status: "RASCUNHO" },
          data: {
            protocolo,
            status: "ENVIADA",
            prazoDias: sol.lote.empreendimento.prazoDias,
            responsavelTecnicoNome: parsed.data.rtNome,
            responsavelTecnicoRegistro: parsed.data.rtRegistro,
            responsavelTecnicoEmail: parsed.data.rtEmail,
            rtExecucaoNome: parsed.data.rtExecNome,
            rtExecucaoRegistro: parsed.data.rtExecRegistro,
            rtExecucaoEmail: parsed.data.rtExecEmail,
          },
        }),
        prisma.historicoEvento.create({
          data: {
            solicitacaoId: sol.id,
            tipo: "SOLICITACAO_ENVIADA",
            texto: `Solicitação protocolada por ${session.user.name}.`,
            cor: "#A89F9F",
            autorId: session.user.id,
          },
        }),
      ]);
      break;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return { error: "Esta solicitação já foi enviada." };
      const colisao = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (!colisao || tentativa >= 4) throw e;
    }
  }

  // Depois do protocolo gravado: e-mail que falha não pode desfazer o envio.
  await emitirAcessoProprietario(sol.id, proprietarioEmail);

  revalidatePath("/requerimentos");
  revalidatePath("/fila");
  revalidatePath("/resumo");
  // O destaque no topo da lista diz se o acesso saiu por e-mail; se não saiu, mostra a
  // senha para o RT repassar. Nada de senha na URL, só o protocolo.
  redirect(`/requerimentos?protocolada=${encodeURIComponent(protocolo)}`);
}

export async function cancelarRascunhoAction(solicitacaoId: string) {
  const session = await requireRole(RT);
  const sol = await prisma.solicitacao.findUniqueOrThrow({ where: { id: solicitacaoId }, include: { lote: true } });
  if (sol.lote.rtId !== session.user.id) return;
  if (sol.status !== "RASCUNHO") return;

  await prisma.solicitacaoDocumento.deleteMany({ where: { solicitacaoId } });
  await prisma.solicitacao.delete({ where: { id: solicitacaoId } });
  redirect("/nova");
}

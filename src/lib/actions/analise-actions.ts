"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { ehZip, extensaoDe } from "@/lib/upload-documento";
import { descartarArquivo, lerArquivoEnviado, receberArquivo } from "@/lib/upload-direto";
import { DOC_ORDER, IRREGULARIDADE_LABEL } from "@/lib/status";
import { emitirAcessoProprietario } from "@/lib/acesso-proprietario";
import { notificarEtapa } from "@/lib/notificacoes";
import { marcarSubstituido, registrarArquivo } from "@/lib/arquivos";
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
  revalidatePath("/obras");
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

function normalizarObservacao(texto: string, max = MAX_OBSERVACAO) {
  const limpo = texto.trim().slice(0, max);
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
  // Já devolvida: devolver de novo não é um novo ciclo, e um clique repetido não
  // deve render outro evento no histórico.
  if (sol.status === "COMPLEMENTO") return;
  // Nada pendente na conferência documental: não há o que pedir de volta.
  if (DOC_ORDER.every((t) => sol.documentos.find((d) => d.tipo === t)?.validado)) return;

  await prisma.$transaction([
    prisma.solicitacao.update({
      where: { id: solicitacaoId },
      // Devolução na conferência documental não consome reenvio.
      data: { status: "COMPLEMENTO", documentacaoValidada: false, devolvidaNoChecklist: false },
    }),
    prisma.historicoEvento.create({
      data: {
        solicitacaoId,
        tipo: "DOCUMENTACAO_DEVOLVIDA",
        texto: "Documentação devolvida para complementação: um ou mais documentos inválidos ou ilegíveis.",
        cor: "#B4711A",
        autorId: session.user.id,
      },
    }),
  ]);
  await notificarEtapa(solicitacaoId, { tipo: "DOCUMENTACAO_DEVOLVIDA" });

  revalidateAll(sol.protocolo);
}

export async function decidirItemAction(solicitacaoId: string, itemId: string, decisao: "APROVADO" | "REPROVADO" | "NAO_SE_APLICA") {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await prisma.solicitacao.findUniqueOrThrow({ where: { id: solicitacaoId } });

  const existing = await prisma.checklistResultado.findUnique({
    where: { solicitacaoId_itemId: { solicitacaoId, itemId } },
  });
  if (existing?.travado) return;

  await prisma.checklistResultado.upsert({
    where: { solicitacaoId_itemId: { solicitacaoId, itemId } },
    create: { solicitacaoId, itemId, status: decisao, avaliadoEm: new Date() },
    // Aprovar ou marcar "não se aplica" encerra a pendência; a observação que a
    // descrevia não vale mais.
    update: { status: decisao, avaliadoEm: new Date(), ...(decisao !== "REPROVADO" && { observacao: null }) },
  });

  if (sol.status === "ENVIADA") {
    // Condicionado ao status: dois cliques simultâneos não mandam dois avisos.
    const { count } = await prisma.solicitacao.updateMany({ where: { id: solicitacaoId, status: "ENVIADA" }, data: { status: "ANALISE" } });
    if (count === 1) await notificarEtapa(solicitacaoId, { tipo: "ANALISE_INICIADA" });
  }

  revalidateAll(sol.protocolo);
}

export type ParecerState = { error?: string; ok?: boolean } | null;

const MAX_COMENTARIO = 2000;
const MAX_APONTAMENTOS_BYTES = 15 * 1024 * 1024;
const EXT_APONTAMENTOS = [".dwg", ".zip", ".pdf"];

export async function emitirParecerAction(solicitacaoId: string, _prev: ParecerState, formData: FormData): Promise<ParecerState> {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  // O arquivo de apontamentos já subiu direto ao Blob (upload-cliente.ts). Qualquer recusa
  // daqui em diante o apaga, para não sobrar arquivo órfão de um parecer não emitido.
  const pathname = String(formData.get("pathname") ?? "");
  const nomeArquivo = String(formData.get("nomeArquivo") ?? "").slice(0, 255);
  const recusar = async (error: string) => {
    if (pathname) await descartarArquivo(pathname);
    return { error };
  };
  const sol = await prisma.solicitacao.findUniqueOrThrow({
    where: { id: solicitacaoId },
    include: { lote: { include: { empreendimento: true } }, resultados: { include: { item: true } } },
  });

  const categorias = await prisma.checklistCategoria.findMany({
    where: { empreendimentoId: sol.lote.empreendimentoId },
    include: { itens: true },
  });
  const totalItens = categorias.reduce((a, c) => a + c.itens.length, 0);
  if (totalItens === 0) return recusar("Este empreendimento ainda não tem itens de check-list.");

  // Decididos, não linhas: um item devolvido guarda o ChecklistResultado com status
  // PENDENTE, e contar linhas daria o check-list por concluído sem estar. "Não se aplica"
  // é decisão também — só não gera pendência.
  const reprovados = sol.resultados.filter((r) => r.status === "REPROVADO");
  const aprovados = sol.resultados.filter((r) => r.status === "APROVADO");
  const naoSeAplica = sol.resultados.filter((r) => r.status === "NAO_SE_APLICA");
  if (aprovados.length + reprovados.length + naoSeAplica.length < totalItens) {
    return recusar("Decida todos os itens do check-list antes de emitir o parecer.");
  }

  // Devolutiva opcional ao RT: comentários gerais e/ou o DWG com os apontamentos. Validada
  // antes de qualquer gravação, para um arquivo recusado não deixar o parecer pela metade.
  const comentario = normalizarObservacao(String(formData.get("comentario") ?? ""), MAX_COMENTARIO);
  let salvo: { nomeArquivo: string; caminhoArquivo: string; tamanhoBytes: number } | null = null;
  if (pathname) {
    const arq = await lerArquivoEnviado(pathname, { destino: "devolutiva", solicitacaoId });
    if (!arq || !nomeArquivo) return recusar("Arquivo de apontamentos não encontrado. Envie de novo.");
    const ext = extensaoDe(nomeArquivo);
    if (!EXT_APONTAMENTOS.includes(ext)) return recusar("O arquivo de apontamentos deve ser DWG, ZIP (vários DWG) ou PDF.");
    if (arq.tamanho > MAX_APONTAMENTOS_BYTES) return recusar("Arquivo de apontamentos maior que 15 MB.");
    if (ext === ".zip" && !ehZip(arq.inicio)) return recusar("Arquivo .zip inválido ou vazio.");
    salvo = { nomeArquivo, caminhoArquivo: pathname, tamanhoBytes: arq.tamanho };
  }
  const devolutiva =
    comentario || salvo
      ? [
          prisma.devolutivaTecnica.create({
            data: {
              solicitacaoId,
              comentario,
              arquivoNome: salvo?.nomeArquivo,
              arquivoCaminho: salvo?.caminhoArquivo,
              arquivoTamanho: salvo?.tamanhoBytes,
              autorId: session.user.id,
            },
          }),
          ...(salvo
            ? [
                registrarArquivo({
                  caminho: salvo.caminhoArquivo,
                  nome: salvo.nomeArquivo,
                  tamanho: salvo.tamanhoBytes,
                  hash: String(formData.get("hash") ?? ""),
                  categoria: "DEVOLUTIVA",
                  solicitacaoId,
                  empreendimentoId: sol.lote.empreendimentoId,
                  enviadoPorId: session.user.id,
                }),
              ]
            : []),
        ]
      : [];
  // O comentário entra também no histórico, que é o que o proprietário acompanha.
  const complemento = `${comentario ? `\nComentários da CAPE: ${comentario}` : ""}${salvo ? "\nA CAPE anexou um arquivo com os apontamentos." : ""}`;

  if (reprovados.length > 0) {
    await prisma.$transaction([
      prisma.solicitacao.update({
        where: { id: solicitacaoId },
        data: { status: "COMPLEMENTO", devolvidaNoChecklist: true },
      }),
      ...[...aprovados, ...naoSeAplica].map((r) => prisma.checklistResultado.update({ where: { id: r.id }, data: { travado: true } })),
      ...reprovados.map((r) => prisma.checklistResultado.update({ where: { id: r.id }, data: { status: "PENDENTE", travado: false } })),
      ...devolutiva,
      prisma.historicoEvento.create({
        data: {
          solicitacaoId,
          tipo: "CHECKLIST_DEVOLVIDO",
          texto: `Devolvida com ${reprovados.length} pendência(s) no check-list técnico.${complemento}`,
          cor: "#B4711A",
          autorId: session.user.id,
        },
      }),
    ]);
    await notificarEtapa(solicitacaoId, {
      tipo: "CHECKLIST_DEVOLVIDO",
      itens: reprovados.map((r) => ({ texto: r.item.texto, observacao: r.observacao })),
      comentario,
      comArquivo: !!salvo,
    });
  } else {
    await prisma.$transaction([
      prisma.solicitacao.update({ where: { id: solicitacaoId }, data: { status: "APROVADA" } }),
      ...devolutiva,
      prisma.historicoEvento.create({
        data: {
          solicitacaoId,
          tipo: "PROJETO_APROVADO",
          texto: `Projeto aprovado. A aprovação da CAPE não substitui a aprovação da Prefeitura.${complemento}`,
          cor: "#24603A",
          autorId: session.user.id,
        },
      }),
    ]);
    await notificarEtapa(solicitacaoId, { tipo: "PROJETO_APROVADO", comentario, comArquivo: !!salvo });
  }

  revalidateAll(sol.protocolo);
  return { ok: true };
}

export async function aceitarAlvaraAction(solicitacaoId: string) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await prisma.solicitacao.findUniqueOrThrow({ where: { id: solicitacaoId } });
  if (sol.status !== "ALVARA_CONFERENCIA") return;

  await prisma.$transaction([
    prisma.solicitacao.update({
      where: { id: solicitacaoId },
      data: { status: "EXECUCAO", statusAntesAlvara: null, alvaraRecusa: null },
    }),
    prisma.historicoEvento.create({
      data: {
        solicitacaoId,
        tipo: "ALVARA_ACEITO",
        texto: "Alvará de execução conferido e aceito pela CAPE. Obra liberada para início.",
        cor: "#3B3486",
        autorId: session.user.id,
      },
    }),
  ]);
  await notificarEtapa(solicitacaoId, { tipo: "ALVARA_ACEITO" });

  revalidateAll(sol.protocolo);
}

export async function recusarAlvaraAction(solicitacaoId: string, formData: FormData) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await prisma.solicitacao.findUniqueOrThrow({ where: { id: solicitacaoId } });
  if (sol.status !== "ALVARA_CONFERENCIA") return;

  const motivo = normalizarObservacao(String(formData.get("motivo") ?? ""));

  await prisma.$transaction([
    prisma.solicitacao.update({
      where: { id: solicitacaoId },
      data: {
        // Volta ao ponto em que estava antes do envio, para o proprietário anexar de novo.
        status: sol.statusAntesAlvara ?? "APROVADA",
        statusAntesAlvara: null,
        alvaraNome: null,
        alvaraCaminho: null,
        alvaraTamanho: null,
        alvaraEnviadoEm: null,
        alvaraRecusa: motivo,
      },
    }),
    // O alvará recusado sai da solicitação, mas o arquivo segue guardado no inventário.
    marcarSubstituido(sol.alvaraCaminho),
    prisma.historicoEvento.create({
      data: {
        solicitacaoId,
        tipo: "ALVARA_RECUSADO",
        texto: motivo ? `Alvará recusado pela CAPE: ${motivo}` : "Alvará recusado pela CAPE. Envie o documento correto.",
        cor: "#8C2B22",
        autorId: session.user.id,
      },
    }),
  ]);
  await notificarEtapa(solicitacaoId, { tipo: "ALVARA_RECUSADO", motivo });

  revalidateAll(sol.protocolo);
}

const MAX_EVIDENCIAS = 8;

const irregularidadeSchema = z.object({
  tipo: z.enum([
    "DIVERGENCIA_PROJETO",
    "RECUO_OU_GABARITO",
    "OBRA_SEM_APROVACAO",
    "CANTEIRO_E_LIMPEZA",
    "HORARIO_OU_RUIDO",
    "DANO_A_AREA_COMUM",
    "OUTRA",
  ]),
  descricao: z.string().trim().min(20, "Descreva a irregularidade com mais detalhes (mínimo 20 caracteres)"),
});

export type IrregularidadeState = { error?: string; ok?: boolean } | null;

// A irregularidade é o registro que sustenta a notificação, então nasce com as
// evidências junto: ou grava tudo, ou não grava nada.
export async function registrarIrregularidadeAction(
  solicitacaoId: string,
  _prev: IrregularidadeState,
  formData: FormData,
): Promise<IrregularidadeState> {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await prisma.solicitacao.findUniqueOrThrow({ where: { id: solicitacaoId }, include: { lote: { select: { empreendimentoId: true } } } });

  // As evidências já subiram direto ao Blob (fotos reduzidas no navegador); aqui cada uma
  // é conferida. Qualquer recusa descarta todas — o registro nasce com as evidências
  // juntas ou não nasce.
  const caminhos = formData.getAll("pathname").map(String);
  const nomes = formData.getAll("nomeArquivo").map((n) => String(n).slice(0, 255));
  const hashes = formData.getAll("hash").map(String);
  const descartarTodas = () => Promise.all(caminhos.map(descartarArquivo));

  const parsed = irregularidadeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    await descartarTodas();
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  if (caminhos.length > MAX_EVIDENCIAS || caminhos.length !== nomes.length) {
    await descartarTodas();
    return { error: `Anexe no máximo ${MAX_EVIDENCIAS} evidências.` };
  }

  const destino = { destino: "evidencia", solicitacaoId } as const;
  const recebidas = await Promise.all(caminhos.map((c, i) => receberArquivo(c, nomes[i], destino)));
  const recusa = recebidas.find((r): r is { erro: string } => "erro" in r);
  if (recusa) {
    await descartarTodas();
    return { error: recusa.erro };
  }
  const salvos = caminhos.map((c, i) => ({ caminhoArquivo: c, nomeArquivo: nomes[i], tamanhoBytes: (recebidas[i] as { tamanho: number }).tamanho }));

  await prisma.$transaction([
    prisma.irregularidade.create({
      data: {
        solicitacaoId,
        tipo: parsed.data.tipo,
        descricao: parsed.data.descricao,
        registradaPorId: session.user.id,
        evidencias: { create: salvos },
      },
    }),
    ...salvos.map((e, i) =>
      registrarArquivo({
        caminho: e.caminhoArquivo,
        nome: e.nomeArquivo,
        tamanho: e.tamanhoBytes,
        hash: hashes[i],
        categoria: "EVIDENCIA",
        solicitacaoId,
        empreendimentoId: sol.lote.empreendimentoId,
        enviadoPorId: session.user.id,
      }),
    ),
    prisma.historicoEvento.create({
      data: {
        solicitacaoId,
        tipo: "IRREGULARIDADE_REGISTRADA",
        texto: `Irregularidade registrada pela CAPE: ${IRREGULARIDADE_LABEL[parsed.data.tipo]}.`,
        cor: "#8C2B22",
        autorId: session.user.id,
      },
    }),
  ]);
  await notificarEtapa(solicitacaoId, { tipo: "IRREGULARIDADE_REGISTRADA", irregularidade: parsed.data.tipo, descricao: parsed.data.descricao });

  revalidateAll(sol.protocolo);
  revalidatePath("/relatorios");
  return { ok: true };
}

export async function regularizarIrregularidadeAction(irregularidadeId: string) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const irr = await prisma.irregularidade.findUniqueOrThrow({
    where: { id: irregularidadeId },
    include: { solicitacao: true },
  });
  if (irr.regularizadaEm) return;

  await prisma.$transaction([
    prisma.irregularidade.update({ where: { id: irregularidadeId }, data: { regularizadaEm: new Date() } }),
    prisma.historicoEvento.create({
      data: {
        solicitacaoId: irr.solicitacaoId,
        tipo: "IRREGULARIDADE_REGULARIZADA",
        texto: `Irregularidade regularizada: ${IRREGULARIDADE_LABEL[irr.tipo]}.`,
        cor: "#24603A",
        autorId: session.user.id,
      },
    }),
  ]);
  await notificarEtapa(irr.solicitacaoId, { tipo: "IRREGULARIDADE_REGULARIZADA", irregularidade: irr.tipo });

  revalidateAll(irr.solicitacao.protocolo);
  revalidatePath("/relatorios");
}

// Encerra a solicitação: a obra terminou e o protocolo vira arquivo.
export async function concluirObraAction(solicitacaoId: string) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await prisma.solicitacao.findUniqueOrThrow({
    where: { id: solicitacaoId },
    include: { irregularidades: true },
  });
  if (sol.status !== "EXECUCAO") return;
  // Encerrar com irregularidade aberta deixaria a pendência sem dono nem prazo.
  if (sol.irregularidades.some((i) => !i.regularizadaEm)) return;

  await prisma.$transaction([
    prisma.solicitacao.update({
      where: { id: solicitacaoId },
      data: { status: "CONCLUIDA", concluidaEm: new Date() },
    }),
    prisma.historicoEvento.create({
      data: {
        solicitacaoId,
        tipo: "OBRA_CONCLUIDA",
        texto: "Obra concluída e solicitação arquivada pela CAPE.",
        cor: "#231F20",
        autorId: session.user.id,
      },
    }),
  ]);
  await notificarEtapa(solicitacaoId, { tipo: "OBRA_CONCLUIDA" });

  revalidateAll(sol.protocolo);
  revalidatePath("/relatorios");
}

export async function togglePagoAction(solicitacaoId: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await prisma.solicitacao.findUniqueOrThrow({ where: { id: solicitacaoId } });
  await prisma.solicitacao.update({ where: { id: solicitacaoId }, data: { pago: !sol.pago } });
  revalidateAll(sol.protocolo);
}

export type ReenvioAcessoState = { error?: string; ok?: string } | null;

// O acesso do proprietário sai sozinho no protocolo; isto é o socorro da CAPE quando o
// e-mail falhou, estava errado, ou o protocolo é anterior ao envio automático. Gera senha
// nova: a anterior — e os acessos abertos com ela — deixa de valer.
export async function reenviarAcessoProprietarioAction(
  solicitacaoId: string,
  _prev: ReenvioAcessoState,
  formData: FormData,
): Promise<ReenvioAcessoState> {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await prisma.solicitacao.findUniqueOrThrow({ where: { id: solicitacaoId } });
  if (sol.status === "RASCUNHO") return { error: "A solicitação ainda não foi protocolada." };

  const email = String(formData.get("proprietarioEmail") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Informe um e-mail válido do proprietário." };

  const { proprietario } = await emitirAcessoProprietario(sol.id, email);
  revalidateAll(sol.protocolo);
  if (proprietario.enviado) return { ok: `Acesso enviado para ${email}, com cópia ao RT.` };
  return {
    error:
      proprietario.motivo === "nao-configurado"
        ? "O envio de e-mail não está configurado (RESEND_API_KEY / EMAIL_REMETENTE)."
        : "O Resend não aceitou o envio agora. Veja o motivo nos logs da Vercel e tente de novo.",
  };
}

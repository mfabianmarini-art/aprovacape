"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { COM_REGRAS } from "@/lib/queries/regras-documentos";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/require-role";
import { ehZip, extensaoDe } from "@/lib/upload-documento";
import { descartarArquivo, lerArquivoEnviado, receberArquivo } from "@/lib/upload-direto";
import { docsObrigatorios, IRREGULARIDADE_LABEL } from "@/lib/status";
import { emitirAcessoProprietario } from "@/lib/acesso-proprietario";
import { notificarEtapa } from "@/lib/notificacoes";
import { checklistDaSolicitacao } from "@/lib/queries/checklist";
import { partesDoItem } from "@/lib/checklist-texto";
import { rtAposDesvinculo, titularidadeEntreLotes } from "@/lib/conferencia-vinculo";
import { excluirVersoesDaAprovacao, marcarSubstituido, registrarArquivo } from "@/lib/arquivos";

async function loadSolicitacao(solicitacaoId: string) {
  return prisma.solicitacao.findUniqueOrThrow({
    where: { id: solicitacaoId },
    include: { documentos: true, lote: { include: { empreendimento: COM_REGRAS } }, lotesAdicionais: { select: { id: true } } },
  });
}

function revalidateAll(protocolo: string) {
  revalidatePath(`/analise/${protocolo}`);
  revalidatePath("/fila");
  revalidatePath("/obras");
  revalidatePath("/resumo");
  revalidatePath("/requerimentos");
}

// chave: o tipo padrão, ou "p_<id>" para documento criado pela CAPE.
export async function toggleDocumentoAction(solicitacaoId: string, chave: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await loadSolicitacao(solicitacaoId);
  const doc = sol.documentos.find((d) => d.chave === chave);
  if (!doc) return;

  const validado = !doc.validado;
  await prisma.solicitacaoDocumento.update({
    where: { id: doc.id },
    // Validou: a pendência descrita deixou de existir, some com ela.
    data: { validado, observacao: validado ? null : doc.observacao },
  });

  const updated = await prisma.solicitacaoDocumento.findMany({ where: { solicitacaoId } });
  const allValidados = docsObrigatorios(sol.lotesAdicionais.length, sol.lote.empreendimento).every((t) => updated.find((d) => d.chave === t)?.validado);
  // O prazo de análise corre da validação documental: começa quando o último documento é
  // validado e, se um deles for desmarcado antes da análise, volta a esperar.
  const prazoInicioEm = allValidados ? (sol.prazoInicioEm ?? new Date()) : sol.status === "ENVIADA" ? null : sol.prazoInicioEm;
  await prisma.solicitacao.update({ where: { id: solicitacaoId }, data: { documentacaoValidada: allValidados, prazoInicioEm } });

  revalidateAll(sol.protocolo);
}

const MAX_OBSERVACAO = 1000;

function normalizarObservacao(texto: string, max = MAX_OBSERVACAO) {
  const limpo = texto.trim().slice(0, max);
  return limpo.length > 0 ? limpo : null;
}

export async function salvarObservacaoDocumentoAction(solicitacaoId: string, chave: string, texto: string) {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await loadSolicitacao(solicitacaoId);
  const doc = sol.documentos.find((d) => d.chave === chave);
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

// Executa uma transação cuja primeira operação muda o status com condição. Se outra
// requisição chegou antes (clique repetido), o update não encontra a linha (P2025), a
// transação inteira é desfeita e devolve false — nada é gravado nem notificado.
async function umaVez(fn: () => Promise<unknown>) {
  try {
    await fn();
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return false;
    throw e;
  }
}

export async function devolverDocumentacaoAction(solicitacaoId: string) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await loadSolicitacao(solicitacaoId);
  // Já devolvida: devolver de novo não é um novo ciclo, e um clique repetido não
  // deve render outro evento no histórico.
  if (sol.status === "COMPLEMENTO") return;
  // Nada pendente na conferência documental: não há o que pedir de volta.
  if (docsObrigatorios(sol.lotesAdicionais.length, sol.lote.empreendimento).every((t) => sol.documentos.find((d) => d.chave === t)?.validado)) return;

  const ok = await umaVez(() =>
    prisma.$transaction([
      // Condicionado ao status: dois cliques simultâneos passam pela checagem acima, mas só
      // o primeiro muda o status — o segundo derruba a transação inteira (sem evento, sem
      // e-mail).
      prisma.solicitacao.update({
        where: { id: solicitacaoId, status: { in: ["ENVIADA", "ANALISE"] } },
        // Devolução na conferência documental não consome reenvio.
        data: { status: "COMPLEMENTO", documentacaoValidada: false, devolvidaNoChecklist: false, prazoInicioEm: null },
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
    ]),
  );
  if (!ok) return;
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
    // O check-list só abre com a documentação validada. Pedido protocolado quando havia mais
    // documentos obrigatórios pode chegar aqui sem ter fechado a validação pelo checkbox.
    const { count } = await prisma.solicitacao.updateMany({
      where: { id: solicitacaoId, status: "ENVIADA" },
      data: { status: "ANALISE", documentacaoValidada: true, prazoInicioEm: sol.prazoInicioEm ?? new Date() },
    });
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
  // Parecer é um por rodada de análise: devolvida ou aprovada, a solicitação sai de
  // ENVIADA/ANALISE e um novo clique não registra nem notifica de novo.
  if (sol.status !== "ENVIADA" && sol.status !== "ANALISE") return recusar("O parecer desta rodada já foi emitido.");

  // Os mesmos itens que a tela de análise mostra (vigentes + já decididos).
  const categorias = await checklistDaSolicitacao(sol.lote.empreendimentoId, sol);
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
  // Aprovar o projeto sem decidir os lotes adicionais deixaria em aberto quais lotes a
  // aprovação cobre. Devolver com pendências não depende disso.
  if (reprovados.length === 0) {
    const lotesPendentes = await prisma.solicitacaoLoteAdicional.count({ where: { solicitacaoId, status: "PENDENTE" } });
    if (lotesPendentes > 0) return recusar("Aprove ou recuse o vínculo dos lotes adicionais antes de aprovar o projeto.");
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
    const ok = await umaVez(() =>
      prisma.$transaction([
        prisma.solicitacao.update({
          where: { id: solicitacaoId, status: { in: ["ENVIADA", "ANALISE"] } },
          data: { status: "COMPLEMENTO", devolvidaNoChecklist: true, prazoInicioEm: null },
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
      ]),
    );
    if (!ok) return recusar("O parecer desta rodada já foi emitido.");
    await notificarEtapa(solicitacaoId, {
      tipo: "CHECKLIST_DEVOLVIDO",
      itens: reprovados.map((r) => ({ texto: partesDoItem(r.item.texto).titulo, observacao: r.observacao })),
      comentario,
      comArquivo: !!salvo,
    });
  } else {
    const ok = await umaVez(() =>
      prisma.$transaction([
        prisma.solicitacao.update({ where: { id: solicitacaoId, status: { in: ["ENVIADA", "ANALISE"] } }, data: { status: "APROVADA" } }),
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
      ]),
    );
    if (!ok) return recusar("O parecer desta rodada já foi emitido.");
    await notificarEtapa(solicitacaoId, { tipo: "PROJETO_APROVADO", comentario, comArquivo: !!salvo });
  }

  revalidateAll(sol.protocolo);
  return { ok: true };
}

export async function aceitarAlvaraAction(solicitacaoId: string) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const sol = await prisma.solicitacao.findUniqueOrThrow({ where: { id: solicitacaoId } });
  if (sol.status !== "ALVARA_CONFERENCIA") return;
  // Os três são requisito da liberação. Falta em envio anterior à exigência: a CAPE recusa
  // e o RT manda de novo.
  if (!sol.alvaraCaminho || !sol.alvaraProjetoCaminho || !sol.alvaraArtCaminho) return;

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
  // Obra liberada: as versões recusadas/substituídas durante a aprovação saem. Depois da
  // resposta; se falhar, a manutenção diária refaz.
  after(() => excluirVersoesDaAprovacao(solicitacaoId).catch((e) => console.error("[liberação] exclusão de versões:", e)));

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
        alvaraArtNome: null,
        alvaraArtCaminho: null,
        alvaraArtTamanho: null,
        alvaraProjetoNome: null,
        alvaraProjetoCaminho: null,
        alvaraProjetoTamanho: null,
        alvaraEnviadoEm: null,
        alvaraRecusa: motivo,
      },
    }),
    // Os documentos recusados saem da solicitação; os arquivos ficam como versões anteriores
    // até a liberação da obra. O RT reenvia os três.
    marcarSubstituido(sol.alvaraCaminho),
    marcarSubstituido(sol.alvaraProjetoCaminho),
    marcarSubstituido(sol.alvaraArtCaminho),
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

// Lote adicional do projeto ainda não vinculado ao RT. Aprovar faz dele um lote do RT,
// como a aprovação de um pedido de vínculo comum; só que a prova é a solicitação em si
// (matrícula anexada) e a conferência é contra o proprietário do lote principal.
async function loadLoteAdicional(id: string) {
  const conta = { select: { id: true, name: true, cpf: true } } as const;
  return prisma.solicitacaoLoteAdicional.findUniqueOrThrow({
    where: { id },
    include: {
      rtAnterior: conta,
      lote: { include: { quadra: { select: { nome: true } }, rt: conta, proprietario: conta } },
      solicitacao: { include: { lote: { include: { proprietario: conta, rt: conta } } } },
    },
  });
}

export async function aprovarLoteAdicionalAction(id: string, formData: FormData) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const adicional = await loadLoteAdicional(id);
  const { lote, solicitacao: sol } = adicional;
  if (adicional.status !== "PENDENTE" || sol.status === "RASCUNHO") return;
  // Quem age pela solicitação é o RT do lote principal; sem ele não há a quem vincular.
  const rt = sol.lote.rt;
  if (!rt) return;
  // Mesma trava da tela: lotes de proprietários diferentes não entram no mesmo projeto.
  if (titularidadeEntreLotes(sol.lote, lote).situacao === "divergente") return;
  // Só lotes contíguos: outra quadra nunca é; dentro dela, o cadastro não guarda quais
  // lotes fazem divisa e a numeração pode ter saltos, então quem aprova declara que conferiu.
  if (lote.quadraId !== sol.lote.quadraId) return;
  if (formData.get("contiguidade") !== "on") return;

  const rotulo = `${lote.quadra.nome} L${lote.numero}`;
  // O lote guarda um único RT: aprovar sobre lote de outro profissional o substitui, e a
  // troca fica no histórico das solicitações daquele lote, como no vínculo comum.
  const substitui = lote.rt && lote.rt.id !== rt.id ? lote.rt : null;
  const solicitacoesDoLote = substitui
    ? await prisma.solicitacao.findMany({ where: { loteId: lote.id, status: { not: "RASCUNHO" } }, select: { id: true } })
    : [];

  const ok = await umaVez(() =>
    prisma.$transaction([
      prisma.solicitacaoLoteAdicional.update({
        where: { id, status: "PENDENTE" },
        data: {
          status: "APROVADO",
          revisadoPorId: session.user.id,
          revisadoEm: new Date(),
          motivoRecusa: null,
          rtAlterado: lote.rtId !== rt.id,
          rtAnteriorId: lote.rtId !== rt.id ? lote.rtId : null,
        },
      }),
      prisma.lote.update({ where: { id: lote.id }, data: { rtId: rt.id } }),
      prisma.historicoEvento.create({
        data: {
          solicitacaoId: sol.id,
          tipo: "LOTE_ADICIONAL_APROVADO",
          texto: `Titularidade e contiguidade na planta conferidas: ${rotulo} vinculado ao responsável técnico ${rt.name} e incluído neste projeto.`,
          cor: "#24603A",
          autorId: session.user.id,
        },
      }),
      ...solicitacoesDoLote.map((s) =>
        prisma.historicoEvento.create({
          data: {
            solicitacaoId: s.id,
            tipo: "VINCULO_SUBSTITUIDO",
            texto: `Responsável técnico do lote alterado pela CAPE: de ${substitui!.name} para ${rt.name} (projeto ${sol.protocolo}). As ações desta solicitação passam para o novo responsável.`,
            cor: "#B4711A",
            autorId: session.user.id,
          },
        }),
      ),
    ]),
  );
  if (!ok) return;

  revalidateAll(sol.protocolo);
  revalidatePath("/empreendimentos");
  revalidatePath("/nova");
}

export async function recusarLoteAdicionalAction(id: string, formData: FormData) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const motivo = normalizarObservacao(String(formData.get("motivo") ?? ""));
  const adicional = await loadLoteAdicional(id);
  const { lote, solicitacao: sol } = adicional;
  if (adicional.status !== "PENDENTE" || sol.status === "RASCUNHO") return;

  const ok = await umaVez(() =>
    prisma.$transaction([
      prisma.solicitacaoLoteAdicional.update({
        where: { id, status: "PENDENTE" },
        data: { status: "RECUSADO", revisadoPorId: session.user.id, revisadoEm: new Date(), motivoRecusa: motivo },
      }),
      prisma.historicoEvento.create({
        data: {
          solicitacaoId: sol.id,
          tipo: "LOTE_ADICIONAL_RECUSADO",
          texto: `${lote.quadra.nome} L${lote.numero} recusado pela CAPE: o lote não faz parte desta aprovação.${motivo ? `\nMotivo: ${motivo}` : ""}`,
          cor: "#8C2B22",
          autorId: session.user.id,
        },
      }),
    ]),
  );
  if (!ok) return;

  revalidateAll(sol.protocolo);
}

// Corrige uma aprovação feita por engano (lotes que, na planta, não fazem divisa). O lote
// sai do projeto e o RT volta a ser o de antes da aprovação; a situação da solicitação não
// muda. Por desfazer uma decisão já comunicada, o motivo é obrigatório.
export async function desvincularLoteAdicionalAction(id: string, formData: FormData) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const motivo = normalizarObservacao(String(formData.get("motivo") ?? ""));
  if (!motivo) return;
  const adicional = await loadLoteAdicional(id);
  const { lote, solicitacao: sol, rtAnterior } = adicional;
  if (adicional.status !== "APROVADO" || sol.status === "RASCUNHO") return;

  const rtProjeto = sol.lote.rt;
  const [projetosNoLote, outrasAprovacoes] = rtProjeto
    ? await Promise.all([
        prisma.solicitacao.count({ where: { loteId: lote.id, criadoPorId: rtProjeto.id, status: { not: "RASCUNHO" } } }),
        prisma.solicitacaoLoteAdicional.count({ where: { loteId: lote.id, id: { not: id }, status: "APROVADO", solicitacao: { lote: { rtId: rtProjeto.id } } } }),
      ])
    : [0, 0];
  const decisao = rtAposDesvinculo({
    rtAlterado: adicional.rtAlterado,
    rtAnteriorId: adicional.rtAnteriorId,
    rtDoLote: lote.rtId,
    rtDoProjeto: rtProjeto?.id ?? null,
    retirarRt: formData.get("retirarRt") === "on",
    temOutroProjeto: projetosNoLote + outrasAprovacoes > 0,
  });
  const restaurado = decisao.altera && decisao.rtId ? rtAnterior : null;
  // A aprovação registrou a troca nas solicitações do lote; a volta fica registrada igual.
  const solicitacoesDoLote = restaurado
    ? await prisma.solicitacao.findMany({ where: { loteId: lote.id, status: { not: "RASCUNHO" } }, select: { id: true } })
    : [];
  const efeito = !decisao.altera
    ? ""
    : restaurado
      ? ` O lote voltou ao responsável técnico ${restaurado.name}.`
      : ` ${rtProjeto?.name} deixa de ser o responsável técnico deste lote.`;

  const ok = await umaVez(() =>
    prisma.$transaction([
      prisma.solicitacaoLoteAdicional.update({
        where: { id, status: "APROVADO" },
        data: { status: "RECUSADO", revisadoPorId: session.user.id, revisadoEm: new Date(), motivoRecusa: motivo },
      }),
      ...(decisao.altera ? [prisma.lote.update({ where: { id: lote.id }, data: { rtId: decisao.rtId } })] : []),
      prisma.historicoEvento.create({
        data: {
          solicitacaoId: sol.id,
          tipo: "LOTE_ADICIONAL_RECUSADO",
          texto: `${lote.quadra.nome} L${lote.numero} desvinculado pela CAPE: o lote deixa de fazer parte desta aprovação.${efeito}\nMotivo: ${motivo}`,
          cor: "#8C2B22",
          autorId: session.user.id,
        },
      }),
      ...solicitacoesDoLote.map((s) =>
        prisma.historicoEvento.create({
          data: {
            solicitacaoId: s.id,
            tipo: "VINCULO_SUBSTITUIDO",
            texto: `Responsável técnico do lote alterado pela CAPE: de ${rtProjeto?.name} para ${restaurado?.name} (desvínculo do projeto ${sol.protocolo}). As ações desta solicitação passam para o novo responsável.`,
            cor: "#B4711A",
            autorId: session.user.id,
          },
        }),
      ),
    ]),
  );
  if (!ok) return;

  revalidateAll(sol.protocolo);
  revalidatePath("/empreendimentos");
  revalidatePath("/nova");
}

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarEmail } from "@/lib/email";
import { montarEmail } from "@/lib/email-layout";
import { linkDoRT, urlDoApp } from "@/lib/url-app";
import { DOC_LABEL, docsObrigatorios, IRREGULARIDADE_LABEL } from "@/lib/status";
import type { IrregularidadeTipo } from "@/generated/prisma/enums";

// Cada mudança de etapa avisa o RT por e-mail, dizendo o que aconteceu, o que ele precisa
// fazer agora e o link de acesso. O proprietário só recebe o e-mail do protocolo
// (acesso-proprietario.ts); o resto ele acompanha em /acompanhar. O envio roda depois da
// resposta (after): a ação da CAPE ou do RT não espera o Resend, e e-mail que falha não desfaz a
// mudança de etapa — fica registrado no log.
export type EventoEtapa =
  | { tipo: "ANALISE_INICIADA" }
  | { tipo: "DOCUMENTACAO_DEVOLVIDA" }
  | { tipo: "CHECKLIST_DEVOLVIDO"; itens: { texto: string; observacao: string | null }[]; comentario: string | null; comArquivo: boolean }
  | { tipo: "COMPLEMENTACAO_RECEBIDA" }
  | { tipo: "PROJETO_APROVADO"; comentario: string | null; comArquivo: boolean }
  | { tipo: "ALVARA_ENVIADO" }
  | { tipo: "ALVARA_ACEITO" }
  | { tipo: "ALVARA_RECUSADO"; motivo: string | null }
  | { tipo: "OBRA_CONCLUIDA" }
  | { tipo: "IRREGULARIDADE_REGISTRADA"; irregularidade: IrregularidadeTipo; descricao: string }
  | { tipo: "IRREGULARIDADE_REGULARIZADA"; irregularidade: IrregularidadeTipo };

// A conta do RT do lote é quem age na plataforma; o e-mail informado no protocolo pode ser
// outro (escritório). Os dois recebem, sem repetir.
export function emailsDoRT(sol: { responsavelTecnicoEmail: string; lote: { rt: { email: string } | null } }) {
  const todos = [sol.lote.rt?.email, sol.responsavelTecnicoEmail].map((e) => e?.trim().toLowerCase()).filter((e): e is string => !!e);
  return [...new Set(todos)];
}

type Mensagem = {
  assunto: string;
  titulo: string;
  cor: string;
  oQue: string;
  acaoRT: string;
  detalhesTitulo?: string;
  detalhes?: string[];
};

const VERDE = "#24603A";
const AMARELO = "#B4711A";
const VERMELHO = "#8C2B22";
const AGUARDE = "Nenhuma ação é necessária agora. Você será avisado por e-mail na próxima etapa.";
const COMPLEMENTAR =
  "Acesse o sistema, abra a solicitação em Meus requerimentos, substitua os documentos indicados abaixo e clique em “Enviar complementação”.";

async function mensagemDo(evento: EventoEtapa, solicitacaoId: string, prazoDias: number): Promise<Mensagem> {
  switch (evento.tipo) {
    case "ANALISE_INICIADA":
      return {
        assunto: "documentação validada, análise técnica iniciada",
        titulo: "Análise técnica iniciada",
        cor: AMARELO,
        oQue: `A CAPE validou a documentação e iniciou a análise técnica do projeto. O prazo de análise é de até ${prazoDias} dias úteis, contados a partir da validação documental.`,
        acaoRT: `${AGUARDE} Se o projeto tiver pendências, elas virão descritas item a item.`,
      };

    case "DOCUMENTACAO_DEVOLVIDA": {
      // O que o analista marcou na conferência: documento não validado (com a observação,
      // se houver) ou que nem chegou.
      const [docs, lotesAdicionais] = await Promise.all([
        prisma.solicitacaoDocumento.findMany({ where: { solicitacaoId } }),
        prisma.solicitacaoLoteAdicional.count({ where: { solicitacaoId } }),
      ]);
      const detalhes = docsObrigatorios(lotesAdicionais).flatMap((t) => {
        const d = docs.find((x) => x.tipo === t);
        if (!d) return [`${DOC_LABEL[t].nome}: não enviado.`];
        if (d.validado) return [];
        return [`${DOC_LABEL[t].nome}: ${d.observacao ?? "documento inválido ou ilegível — envie novamente."}`];
      });
      return {
        assunto: "documentação devolvida para complementação",
        titulo: "Documentação a complementar",
        cor: VERMELHO,
        oQue: `Na conferência da documentação, a CAPE encontrou documentos que precisam ser corrigidos ou reenviados. A análise do projeto só começa depois que a documentação estiver completa — o prazo de ${prazoDias} dias úteis conta a partir da validação.`,
        acaoRT: COMPLEMENTAR,
        detalhesTitulo: "Documentos a complementar",
        detalhes,
      };
    }

    case "CHECKLIST_DEVOLVIDO":
      return {
        assunto: "projeto com pendências, complementação necessária",
        titulo: "Projeto com pendências",
        cor: VERMELHO,
        oQue: `A análise técnica encontrou ${evento.itens.length} pendência(s) no projeto em relação às normas do loteamento. O projeto precisa ser corrigido e reenviado para nova análise.`,
        acaoRT: `Corrija o projeto conforme as pendências abaixo${evento.comArquivo ? " e o arquivo de apontamentos da CAPE, disponível na solicitação" : ""}. Depois, em Meus requerimentos, substitua os documentos afetados e clique em “Enviar complementação”.`,
        detalhesTitulo: "Pendências do check-list",
        detalhes: [
          ...evento.itens.map((i) => (i.observacao ? `${i.texto}\nApontamento: ${i.observacao}` : i.texto)),
          ...(evento.comentario ? [`Comentários gerais da CAPE: ${evento.comentario}`] : []),
        ],
      };

    case "COMPLEMENTACAO_RECEBIDA":
      return {
        assunto: "complementação recebida",
        titulo: "Complementação recebida",
        cor: AMARELO,
        oQue: "A CAPE recebeu os documentos complementados. A solicitação volta para conferência e reanálise.",
        acaoRT: AGUARDE,
      };

    case "PROJETO_APROVADO":
      return {
        assunto: "projeto aprovado, apresente o alvará de execução",
        titulo: "Projeto aprovado",
        cor: VERDE,
        oQue: "A CAPE aprovou o projeto. A aprovação da CAPE não substitui a aprovação da Prefeitura: a obra só pode começar depois que o alvará de execução emitido pela Prefeitura for apresentado no sistema e conferido pela CAPE.",
        acaoRT: `Obtenha o alvará de execução na Prefeitura e anexe-o (PDF) na solicitação, em Meus requerimentos, junto com o projeto carimbado pela Prefeitura e a ART/RRT de execução atual e válida.${evento.comArquivo ? " A CAPE anexou um arquivo com observações, disponível na solicitação." : ""}`,
        ...(evento.comentario && { detalhesTitulo: "Comentários da CAPE", detalhes: [evento.comentario] }),
      };

    case "ALVARA_ENVIADO":
      return {
        assunto: "alvará de execução em conferência",
        titulo: "Alvará em conferência",
        cor: AMARELO,
        oQue: "O alvará de execução, o projeto carimbado pela Prefeitura e a ART/RRT de execução foram enviados e estão em conferência pela CAPE.",
        acaoRT: "Aguarde a conferência. A obra só pode começar depois que a CAPE aceitar o alvará — você será avisado por e-mail.",
      };

    case "ALVARA_ACEITO":
      return {
        assunto: "alvará aceito, obra liberada",
        titulo: "Obra liberada",
        cor: VERDE,
        oQue: "A CAPE conferiu e aceitou o alvará de execução. A obra está liberada para início.",
        acaoRT: "A obra pode começar. Execute conforme o projeto aprovado e as regras do loteamento; a CAPE acompanha a execução e avisa se registrar alguma irregularidade.",
      };

    case "ALVARA_RECUSADO":
      return {
        assunto: "alvará recusado, envie novamente",
        titulo: "Alvará recusado",
        cor: VERMELHO,
        oQue: "A CAPE não aceitou o alvará de execução enviado. A obra continua sem liberação para início.",
        acaoRT: "Anexe novamente o alvará de execução correto, o projeto carimbado pela Prefeitura e a ART/RRT de execução atual (PDF) na solicitação, em Meus requerimentos.",
        detalhesTitulo: "Motivo",
        detalhes: [evento.motivo ?? "O documento enviado não é o alvará de execução válido para esta obra."],
      };

    case "OBRA_CONCLUIDA":
      return {
        assunto: "obra concluída",
        titulo: "Obra concluída",
        cor: VERDE,
        oQue: "A CAPE registrou a conclusão da obra e arquivou a solicitação.",
        acaoRT: "Nenhuma ação é necessária. O histórico continua disponível no sistema.",
      };

    case "IRREGULARIDADE_REGISTRADA":
      return {
        assunto: "irregularidade registrada na obra",
        titulo: "Irregularidade registrada",
        cor: VERMELHO,
        oQue: `A CAPE registrou uma irregularidade na obra: ${IRREGULARIDADE_LABEL[evento.irregularidade]}.`,
        acaoRT: "Regularize a situação descrita abaixo o quanto antes e informe a CAPE. A solicitação só pode ser encerrada depois que a irregularidade for regularizada.",
        detalhesTitulo: "Descrição",
        detalhes: [evento.descricao],
      };

    case "IRREGULARIDADE_REGULARIZADA":
      return {
        assunto: "irregularidade regularizada",
        titulo: "Irregularidade regularizada",
        cor: VERDE,
        oQue: `A CAPE registrou como regularizada a irregularidade: ${IRREGULARIDADE_LABEL[evento.irregularidade]}.`,
        acaoRT: "Nenhuma ação é necessária. Siga a execução conforme o projeto aprovado.",
      };
  }
}

async function enviarNotificacao(solicitacaoId: string, evento: EventoEtapa, base: string) {
  const sol = await prisma.solicitacao.findUniqueOrThrow({
    where: { id: solicitacaoId },
    select: {
      protocolo: true,
      responsavelTecnicoEmail: true,
      prazoDias: true,
      lote: {
        select: {
          numero: true,
          rt: { select: { email: true } },
          quadra: { select: { nome: true } },
          empreendimento: { select: { nome: true } },
        },
      },
    },
  });
  const rt = emailsDoRT(sol);
  if (rt.length === 0) return;
  const m = await mensagemDo(evento, solicitacaoId, sol.prazoDias);
  await enviarEmail({
    para: rt,
    ...montarEmail({
      assunto: `CAPE Aprova — ${sol.protocolo}: ${m.assunto}`,
      cabecalho: `Solicitação ${sol.protocolo}`,
      titulo: m.titulo,
      cor: m.cor,
      dados: [["Lote", `${sol.lote.empreendimento.nome} · ${sol.lote.quadra.nome} L${sol.lote.numero}`]],
      detalhesTitulo: m.detalhesTitulo,
      detalhes: m.detalhes,
      paragrafos: [m.oQue],
      acao: m.acaoRT,
      link: { url: linkDoRT(base), rotulo: "Acessar o sistema" },
    }),
  });
}

// Chamar depois de gravada a mudança de etapa. O endereço do app é lido já (vem da
// requisição quando não há APP_URL); o resto vai para depois da resposta.
export async function notificarEtapa(solicitacaoId: string, evento: EventoEtapa) {
  const base = await urlDoApp();
  after(async () => {
    try {
      await enviarNotificacao(solicitacaoId, evento, base);
    } catch (e) {
      console.error(`[email] falha ao notificar ${evento.tipo} da solicitação ${solicitacaoId}:`, e);
    }
  });
}

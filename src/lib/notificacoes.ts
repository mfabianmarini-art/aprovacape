import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarEmail } from "@/lib/email";
import { montarEmail } from "@/lib/email-layout";
import { linkDoProprietario, linkDoRT, urlDoApp } from "@/lib/url-app";
import { DOC_LABEL, DOC_ORDER, IRREGULARIDADE_LABEL } from "@/lib/status";
import type { IrregularidadeTipo } from "@/generated/prisma/enums";

// Cada mudança de etapa avisa por e-mail o RT e o proprietário, dizendo o que aconteceu,
// o que cada um precisa fazer agora e o link de acesso. O envio roda depois da resposta
// (after): a ação da CAPE ou do RT não espera o Resend, e e-mail que falha não desfaz a
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
  oQue: string; // o que aconteceu, para os dois
  acaoRT: string;
  acaoProprietario: string;
  detalhesTitulo?: string;
  detalhes?: string[];
};

const VERDE = "#24603A";
const AMARELO = "#B4711A";
const VERMELHO = "#8C2B22";
const AGUARDE = "Nenhuma ação é necessária agora. Você será avisado por e-mail na próxima etapa.";
const COMPLEMENTAR =
  "Acesse o sistema, abra a solicitação em Meus requerimentos, substitua os documentos indicados abaixo e clique em “Enviar complementação”.";

async function mensagemDo(evento: EventoEtapa, solicitacaoId: string, nomeRT: string): Promise<Mensagem> {
  const rtCuida = `O responsável técnico ${nomeRT} já foi avisado e é quem envia as correções. Nenhuma ação sua é necessária, mas vale conversar com ele sobre os ajustes.`;

  switch (evento.tipo) {
    case "ANALISE_INICIADA":
      return {
        assunto: "documentação validada, análise técnica iniciada",
        titulo: "Análise técnica iniciada",
        cor: AMARELO,
        oQue: "A CAPE validou a documentação e iniciou a análise técnica do projeto. O prazo de análise é de até 15 dias úteis, contados a partir da validação documental.",
        acaoRT: `${AGUARDE} Se o projeto tiver pendências, elas virão descritas item a item.`,
        acaoProprietario: AGUARDE,
      };

    case "DOCUMENTACAO_DEVOLVIDA": {
      // O que o analista marcou na conferência: documento não validado (com a observação,
      // se houver) ou que nem chegou.
      const docs = await prisma.solicitacaoDocumento.findMany({ where: { solicitacaoId } });
      const detalhes = DOC_ORDER.flatMap((t) => {
        const d = docs.find((x) => x.tipo === t);
        if (!d) return [`${DOC_LABEL[t].nome}: não enviado.`];
        if (d.validado) return [];
        return [`${DOC_LABEL[t].nome}: ${d.observacao ?? "documento inválido ou ilegível — envie novamente."}`];
      });
      return {
        assunto: "documentação devolvida para complementação",
        titulo: "Documentação a complementar",
        cor: VERMELHO,
        oQue: "Na conferência da documentação, a CAPE encontrou documentos que precisam ser corrigidos ou reenviados. A análise do projeto só começa depois que a documentação estiver completa — o prazo de 15 dias úteis conta a partir da validação.",
        acaoRT: COMPLEMENTAR,
        acaoProprietario: rtCuida,
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
        acaoProprietario: rtCuida,
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
        acaoProprietario: AGUARDE,
      };

    case "PROJETO_APROVADO":
      return {
        assunto: "projeto aprovado, apresente o alvará de execução",
        titulo: "Projeto aprovado",
        cor: VERDE,
        oQue: "A CAPE aprovou o projeto. A aprovação da CAPE não substitui a aprovação da Prefeitura: a obra só pode começar depois que o alvará de execução emitido pela Prefeitura for apresentado no sistema e conferido pela CAPE.",
        acaoRT: `Obtenha o alvará de execução na Prefeitura e anexe-o (PDF) na solicitação, em Meus requerimentos.${evento.comArquivo ? " A CAPE anexou um arquivo com observações, disponível na solicitação." : ""}`,
        acaoProprietario: `O responsável técnico ${nomeRT} deve apresentar no sistema o alvará de execução emitido pela Prefeitura. Não inicie a obra antes da conferência do alvará pela CAPE.`,
        ...(evento.comentario && { detalhesTitulo: "Comentários da CAPE", detalhes: [evento.comentario] }),
      };

    case "ALVARA_ENVIADO":
      return {
        assunto: "alvará de execução em conferência",
        titulo: "Alvará em conferência",
        cor: AMARELO,
        oQue: "O alvará de execução foi enviado e está em conferência pela CAPE.",
        acaoRT: "Aguarde a conferência. A obra só pode começar depois que a CAPE aceitar o alvará — você será avisado por e-mail.",
        acaoProprietario: "Aguarde a conferência. A obra só pode começar depois que a CAPE aceitar o alvará — você será avisado por e-mail.",
      };

    case "ALVARA_ACEITO":
      return {
        assunto: "alvará aceito, obra liberada",
        titulo: "Obra liberada",
        cor: VERDE,
        oQue: "A CAPE conferiu e aceitou o alvará de execução. A obra está liberada para início.",
        acaoRT: "A obra pode começar. Execute conforme o projeto aprovado e as regras do loteamento; a CAPE acompanha a execução e avisa se registrar alguma irregularidade.",
        acaoProprietario: "A obra pode começar. Ela deve seguir o projeto aprovado e as regras do loteamento; a CAPE acompanha a execução.",
      };

    case "ALVARA_RECUSADO":
      return {
        assunto: "alvará recusado, envie novamente",
        titulo: "Alvará recusado",
        cor: VERMELHO,
        oQue: "A CAPE não aceitou o alvará de execução enviado. A obra continua sem liberação para início.",
        acaoRT: "Anexe novamente o alvará de execução correto (PDF) na solicitação, em Meus requerimentos.",
        acaoProprietario: `O responsável técnico ${nomeRT} deve enviar o alvará correto. Não inicie a obra antes da liberação pela CAPE.`,
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
        acaoProprietario: "Nenhuma ação é necessária. O histórico continua disponível para consulta.",
      };

    case "IRREGULARIDADE_REGISTRADA":
      return {
        assunto: "irregularidade registrada na obra",
        titulo: "Irregularidade registrada",
        cor: VERMELHO,
        oQue: `A CAPE registrou uma irregularidade na obra: ${IRREGULARIDADE_LABEL[evento.irregularidade]}.`,
        acaoRT: "Regularize a situação descrita abaixo o quanto antes e informe a CAPE. A solicitação só pode ser encerrada depois que a irregularidade for regularizada.",
        acaoProprietario: `Converse com o responsável técnico ${nomeRT} e providencie a regularização. A obra só pode ser encerrada depois que a irregularidade for regularizada.`,
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
        acaoProprietario: "Nenhuma ação é necessária.",
      };
  }
}

async function enviarNotificacao(solicitacaoId: string, evento: EventoEtapa, base: string) {
  const sol = await prisma.solicitacao.findUniqueOrThrow({
    where: { id: solicitacaoId },
    select: {
      protocolo: true,
      proprietarioEmail: true,
      responsavelTecnicoNome: true,
      responsavelTecnicoEmail: true,
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
  const m = await mensagemDo(evento, solicitacaoId, sol.responsavelTecnicoNome);
  const comum = {
    assunto: `CAPE Aprova — ${sol.protocolo}: ${m.assunto}`,
    protocolo: sol.protocolo,
    titulo: m.titulo,
    cor: m.cor,
    dados: [["Lote", `${sol.lote.empreendimento.nome} · ${sol.lote.quadra.nome} L${sol.lote.numero}`]] as [string, string][],
    detalhesTitulo: m.detalhesTitulo,
    detalhes: m.detalhes,
  };

  const envios: Promise<unknown>[] = [];
  const rt = emailsDoRT(sol);
  if (rt.length > 0) {
    envios.push(
      enviarEmail({
        para: rt,
        ...montarEmail({ ...comum, paragrafos: [m.oQue], acao: m.acaoRT, link: { url: linkDoRT(base), rotulo: "Acessar o sistema" } }),
      }),
    );
  }
  // Sem e-mail do proprietário (protocolos antigos): só o RT é avisado.
  if (sol.proprietarioEmail) {
    envios.push(
      enviarEmail({
        para: [sol.proprietarioEmail],
        ...montarEmail({
          ...comum,
          paragrafos: [m.oQue],
          acao: m.acaoProprietario,
          link: { url: linkDoProprietario(base, sol.protocolo), rotulo: "Acompanhar a solicitação" },
          rodape: "Este é um e-mail automático da CAPE Aprova. Para acompanhar, use o protocolo e a senha recebidos no protocolo da solicitação; dúvidas sobre o projeto, fale com o responsável técnico.",
        }),
      }),
    );
  }
  await Promise.all(envios);
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

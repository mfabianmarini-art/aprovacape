import type { SolicitacaoStatus } from "@/generated/prisma/enums";

// Verde concluída, amarelo em andamento, cinza não iniciada. "reprovada" só aparece na
// etapa de aprovação, quando o projeto é reprovado em definitivo.
export type EstadoEtapa = "concluida" | "andamento" | "pendente" | "reprovada";
export type Etapa = { titulo: string; estado: EstadoEtapa; detalhe: string };

type Base = { status: SolicitacaoStatus; documentacaoValidada: boolean; devolvidaNoChecklist: boolean };

const APROVADO: SolicitacaoStatus[] = ["APROVADA", "RESSALVAS", "ALVARA_CONFERENCIA", "EXECUCAO", "CONCLUIDA"];

// Uma leitura só do andamento, usada pela tela do RT e pela do proprietário, para as
// duas nunca contarem histórias diferentes sobre a mesma solicitação.
export function etapasDaSolicitacao(s: Base): Etapa[] {
  const { status } = s;
  const aprovado = APROVADO.includes(status);
  const reprovado = status === "REPROVADA";
  const decidido = aprovado || reprovado;

  // COMPLEMENTO volta a bola para o RT na fase que devolveu: conferência de documentos
  // ou check-list técnico (devolvidaNoChecklist).
  const docsDevolvidos = status === "COMPLEMENTO" && !s.devolvidaNoChecklist;
  const docsEmConferencia = status === "ENVIADA" && !s.documentacaoValidada;
  const checklistDevolvido = status === "COMPLEMENTO" && s.devolvidaNoChecklist;
  const emAnaliseTecnica = status === "ANALISE" || (status === "ENVIADA" && s.documentacaoValidada);

  const alvaraAceito = status === "EXECUCAO" || status === "CONCLUIDA";

  return [
    { titulo: "Protocolo", estado: "concluida", detalhe: "recebido pela CAPE" },
    {
      titulo: "Validação documental",
      estado: docsDevolvidos || docsEmConferencia ? "andamento" : "concluida",
      detalhe: docsDevolvidos ? "aguardando correção do RT" : docsEmConferencia ? "em conferência pela CAPE" : "documentos validados",
    },
    {
      titulo: "Análise técnica",
      estado: decidido ? "concluida" : checklistDevolvido || emAnaliseTecnica ? "andamento" : "pendente",
      detalhe: decidido
        ? "check-list concluído"
        : checklistDevolvido
          ? "aguardando correção do RT"
          : emAnaliseTecnica
            ? "em análise pela CAPE"
            : "após a validação documental",
    },
    {
      titulo: "Aprovação do projeto",
      estado: reprovado ? "reprovada" : aprovado ? "concluida" : "pendente",
      detalhe: reprovado ? "projeto reprovado" : status === "RESSALVAS" ? "aprovado com ressalvas" : aprovado ? "projeto aprovado" : "após a análise técnica",
    },
    {
      titulo: "Alvará de execução",
      estado: alvaraAceito ? "concluida" : status === "APROVADA" || status === "RESSALVAS" || status === "ALVARA_CONFERENCIA" ? "andamento" : "pendente",
      detalhe: alvaraAceito
        ? "alvará aceito pela CAPE"
        : status === "ALVARA_CONFERENCIA"
          ? "em conferência pela CAPE"
          : status === "APROVADA" || status === "RESSALVAS"
            ? "aguardando envio pelo RT"
            : "após a aprovação",
    },
    {
      titulo: "Obra",
      estado: status === "CONCLUIDA" ? "concluida" : status === "EXECUCAO" ? "andamento" : "pendente",
      detalhe: status === "CONCLUIDA" ? "concluída" : status === "EXECUCAO" ? "liberada, em execução" : "após o alvará",
    },
  ];
}

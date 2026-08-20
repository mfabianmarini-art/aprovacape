import type { SolicitacaoStatus, DocumentoTipo, SolicitacaoTipo } from "@/generated/prisma/enums";

export const STATUS_INFO: Record<SolicitacaoStatus, { label: string; bg: string; fg: string }> = {
  RASCUNHO: { label: "Rascunho", bg: "#E7E5DF", fg: "#5A6270" },
  ENVIADA: { label: "Enviada", bg: "#DCE9F2", fg: "#12455E" },
  ANALISE: { label: "Em análise técnica", bg: "#12455E", fg: "#FFFFFF" },
  COMPLEMENTO: { label: "Aguardando complementação", bg: "#F6E3C4", fg: "#8A5210" },
  APROVADA: { label: "Aprovada", bg: "#D8E9DA", fg: "#24603A" },
  RESSALVAS: { label: "Aprovada com ressalvas", bg: "#E4EBD3", fg: "#4C6321" },
  REPROVADA: { label: "Reprovada", bg: "#F3DAD6", fg: "#8C2B22" },
  EXECUCAO: { label: "Obra em execução", bg: "#DEDCF0", fg: "#3B3486" },
  CONCLUIDA: { label: "Concluída / habite-se", bg: "#0E1B24", fg: "#FFFFFF" },
};

export const LIVRE_INFO = { label: "Sem solicitação", bg: "#EDE9E1", fg: "#6B7480" };

export const DOC_LABEL: Record<DocumentoTipo, { nome: string }> = {
  PROJETO_ARQUITETONICO: { nome: "Projeto arquitetônico (PDF)" },
  ART_RRT: { nome: "ART / RRT do responsável técnico" },
  MEMORIAL_DESCRITIVO: { nome: "Memorial descritivo" },
  PROJETO_ESTRUTURAL: { nome: "Projeto estrutural" },
  DOC_RESPONSAVEL_TECNICO: { nome: "Documento do responsável técnico" },
};

export const DOC_ORDER: DocumentoTipo[] = [
  "PROJETO_ARQUITETONICO",
  "ART_RRT",
  "MEMORIAL_DESCRITIVO",
  "PROJETO_ESTRUTURAL",
  "DOC_RESPONSAVEL_TECNICO",
];

export const TIPO_LABEL: Record<SolicitacaoTipo, string> = {
  OBRA_NOVA: "Obra nova",
  REFORMA: "Reforma",
  AMPLIACAO: "Ampliação",
  DEMOLICAO: "Demolição",
  MURO: "Muro / fechamento",
};

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

export function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

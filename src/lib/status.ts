import type { SolicitacaoStatus, DocumentoTipo, SolicitacaoTipo, DocumentoTecnicoCategoria, IrregularidadeTipo } from "@/generated/prisma/enums";

export const STATUS_INFO: Record<SolicitacaoStatus, { label: string; bg: string; fg: string }> = {
  RASCUNHO: { label: "Rascunho", bg: "#E7E5DF", fg: "#5A6270" },
  ENVIADA: { label: "Em análise", bg: "#CFD8DE", fg: "#2E4653" },
  ANALISE: { label: "Em análise técnica", bg: "#E01B22", fg: "#FFFFFF" },
  COMPLEMENTO: { label: "Aguardando complementação", bg: "#F6E3C4", fg: "#8A5210" },
  APROVADA: { label: "Aprovada", bg: "#D8E9DA", fg: "#24603A" },
  RESSALVAS: { label: "Aprovada com ressalvas", bg: "#EFF3C9", fg: "#5C6B12" },
  REPROVADA: { label: "Reprovada", bg: "#F3DAD6", fg: "#8C2B22" },
  ALVARA_CONFERENCIA: { label: "Alvará em conferência", bg: "#E4DCF0", fg: "#4B3A7A" },
  EXECUCAO: { label: "Obra aprovada", bg: "#DEDCF0", fg: "#3B3486" },
  CONCLUIDA: { label: "Concluída / habite-se", bg: "#231F20", fg: "#FFFFFF" },
};

export const LIVRE_INFO = { label: "Sem solicitação", bg: "#EDE9E1", fg: "#7A7472" };

export const DOC_LABEL: Record<DocumentoTipo, { nome: string }> = {
  PROJETO_ARQUITETONICO: { nome: "Projeto arquitetônico" },
  ART_RRT_PROJETO: { nome: "ART/RRT do responsável técnico pelo projeto" },
  ART_RRT_EXECUCAO: { nome: "ART/RRT do responsável técnico pela execução" },
  MEMORIAL_DESCRITIVO: { nome: "Memorial descritivo" },
  PROJETO_PAISAGISTICO: { nome: "Projeto paisagístico" },
  CAPA_IPTU: { nome: "Capa do IPTU" },
  MATRICULA: { nome: "Matrícula do lote" },
  LEVANTAMENTO_PLANIALTIMETRICO: { nome: "Levantamento planialtimétrico" },
  OUTROS: { nome: "Outros documentos" },
};

// Todos obrigatórios, exceto OUTROS — que fica fora desta lista para não entrar na
// conferência documental nem travar o envio da solicitação.
export const DOC_ORDER: DocumentoTipo[] = [
  "PROJETO_ARQUITETONICO",
  "ART_RRT_PROJETO",
  "ART_RRT_EXECUCAO",
  "MEMORIAL_DESCRITIVO",
  "PROJETO_PAISAGISTICO",
  "CAPA_IPTU",
  "MATRICULA",
  "LEVANTAMENTO_PLANIALTIMETRICO",
];

// Formato e tamanho aceitos por documento. Projetos podem vir em DWG para a CAPE
// conferir no CAD; os demais são leitura, então só PDF. OUTROS aceita imagem também,
// por ser o campo livre para o que não se encaixa nos demais.
export const DOC_REGRAS: Record<DocumentoTipo, { extensoes: readonly string[]; maxMB: number }> = {
  PROJETO_ARQUITETONICO: { extensoes: [".pdf", ".dwg"], maxMB: 5 },
  ART_RRT_PROJETO: { extensoes: [".pdf"], maxMB: 5 },
  ART_RRT_EXECUCAO: { extensoes: [".pdf"], maxMB: 5 },
  MEMORIAL_DESCRITIVO: { extensoes: [".pdf"], maxMB: 5 },
  PROJETO_PAISAGISTICO: { extensoes: [".pdf", ".dwg"], maxMB: 5 },
  CAPA_IPTU: { extensoes: [".pdf"], maxMB: 5 },
  MATRICULA: { extensoes: [".pdf"], maxMB: 5 },
  LEVANTAMENTO_PLANIALTIMETRICO: { extensoes: [".pdf", ".dwg"], maxMB: 5 },
  OUTROS: { extensoes: [".pdf", ".dwg", ".jpg", ".jpeg", ".png"], maxMB: 10 },
};

export const IRREGULARIDADE_LABEL: Record<IrregularidadeTipo, string> = {
  DIVERGENCIA_PROJETO: "Execução divergente do projeto aprovado",
  RECUO_OU_GABARITO: "Recuo ou gabarito fora do aprovado",
  OBRA_SEM_APROVACAO: "Obra ou intervenção sem aprovação",
  CANTEIRO_E_LIMPEZA: "Canteiro, entulho ou limpeza",
  HORARIO_OU_RUIDO: "Horário de trabalho ou ruído",
  DANO_A_AREA_COMUM: "Dano a área comum ou a lote vizinho",
  OUTRA: "Outra irregularidade",
};

export function formatosAceitos(tipo: DocumentoTipo) {
  const { extensoes, maxMB } = DOC_REGRAS[tipo];
  const nomes = extensoes.map((e) => e.replace(".", "").toUpperCase()).join(" ou ");
  return `${nomes}, até ${maxMB} MB`;
}

export const TIPO_LABEL: Record<SolicitacaoTipo, string> = {
  OBRA_NOVA: "Obra nova",
  REFORMA: "Reforma",
  AMPLIACAO: "Ampliação",
  DEMOLICAO: "Demolição",
  MURO: "Muro / fechamento",
  PAISAGISMO: "Paisagismo",
};

export const CATEGORIA_DOC_TECNICO_LABEL: Record<DocumentoTecnicoCategoria, string> = {
  MANUAL_PROPRIETARIO: "Manual do proprietário",
  CONVENCAO_CONDOMINIO: "Convenção do condomínio",
  REGULAMENTO: "Regulamento",
  OUTRO: "Outro",
};

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Estas telas são renderizadas no servidor, que na Vercel roda em UTC — sem fixar o
// fuso, um evento das 22h de Brasília aparecia como 01h do dia seguinte. O fuso do
// empreendimento é o que interessa aqui, não o da máquina que renderiza.
const FUSO_BRASIL = "America/Sao_Paulo";

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_BRASIL }).format(d);
}

export function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: FUSO_BRASIL }).format(d);
}

// Datas sem hora (nascimento) são gravadas como meia-noite UTC a partir de um
// <input type="date">. Convertê-las para Brasília as jogaria para o dia anterior, então
// são lidas no mesmo fuso em que foram gravadas.
export function formatDataPura(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);
}

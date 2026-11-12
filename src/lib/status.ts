import { exigeRegulamentoArqp } from "@/lib/regulamento-arqp";
import type { DocumentoExigencia, SolicitacaoStatus, DocumentoTipo, SolicitacaoTipo, DocumentoTecnicoCategoria, IrregularidadeTipo, VinculoStatus } from "@/generated/prisma/enums";

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
  PROJETO_ARQUITETONICO: { nome: "Projeto arquitetônico (PDF)" },
  PROJETO_ARQUITETONICO_DWG: { nome: "Projeto arquitetônico (DWG)" },
  ART_RRT_PROJETO: { nome: "ART/RRT do responsável técnico pelo projeto" },
  ART_RRT_EXECUCAO: { nome: "ART/RRT do responsável técnico pela execução" },
  MEMORIAL_DESCRITIVO: { nome: "Memorial descritivo" },
  PROJETO_PAISAGISTICO: { nome: "Projeto paisagístico" },
  CAPA_IPTU: { nome: "Capa do IPTU" },
  MATRICULA: { nome: "Matrícula do lote" },
  LEVANTAMENTO_PLANIALTIMETRICO: { nome: "Levantamento planialtimétrico" },
  PROJETO_APROVADO_PREFEITURA: { nome: "Projeto de unificação de lote aprovado na prefeitura" },
  ART_UNIFICACAO: { nome: "ART/RRT da unificação dos lotes" },
  TERMO_REGULAMENTO_ARQP: { nome: "Termo de ciência e concordância do Regulamento de Obras – ARQP" },
  PERSONALIZADO: { nome: "Documento pedido pela CAPE" },
  OUTROS: { nome: "Outros documentos" },
};

// Padrão da plataforma, que a CAPE pode mudar por empreendimento (RegraDocumento). Para
// saber o que uma solicitação exige, use docsObrigatorios / docsOpcionais.
//
// Obrigatórios em toda solicitação: entram na conferência documental e travam o envio
// enquanto faltarem.
export const DOC_ORDER: DocumentoTipo[] = [
  "PROJETO_ARQUITETONICO",
  "PROJETO_ARQUITETONICO_DWG",
  "ART_RRT_PROJETO",
  "MEMORIAL_DESCRITIVO",
  "LEVANTAMENTO_PLANIALTIMETRICO",
];

// Exigidos a mais em projeto de mais de um lote: a unificação precisa de aprovação prévia
// na Prefeitura.
export const DOC_PROJETO_CONJUNTO: DocumentoTipo[] = ["PROJETO_APROVADO_PREFEITURA", "ART_UNIFICACAO"];

// Exigido a mais no Quinta da Primavera, onde vale o Regulamento de Obras da ARQP.
export const DOC_ARQP: DocumentoTipo[] = ["TERMO_REGULAMENTO_ARQP"];

// Opcionais: anexados quando houver, ficam fora da conferência documental e não travam
// nada — a CAPE só os consulta.
export const DOC_OPCIONAIS: DocumentoTipo[] = ["ART_RRT_EXECUCAO", "CAPA_IPTU", "MATRICULA", "PROJETO_PAISAGISTICO", "OUTROS"];

// Todos os documentos, na ordem em que aparecem nas telas.
export const DOC_TODOS: DocumentoTipo[] = [...DOC_ORDER, ...DOC_PROJETO_CONJUNTO, ...DOC_ARQP, ...DOC_OPCIONAIS];

export const EXIGENCIA_LABEL: Record<DocumentoExigencia, string> = {
  OBRIGATORIO: "Obrigatório",
  OBRIGATORIO_MAIS_LOTES: "Obrigatório em projeto de mais de um lote",
  OPCIONAL: "Opcional",
  NAO_SOLICITADO: "Não pedido",
};

export function exigenciaPadrao(tipo: DocumentoTipo, empreendimento: string): DocumentoExigencia {
  if (DOC_ORDER.includes(tipo)) return "OBRIGATORIO";
  if (DOC_PROJETO_CONJUNTO.includes(tipo)) return "OBRIGATORIO_MAIS_LOTES";
  if (DOC_ARQP.includes(tipo)) return exigeRegulamentoArqp(empreendimento) ? "OBRIGATORIO" : "NAO_SOLICITADO";
  return "OPCIONAL";
}

// Documento criado pela CAPE (DocumentoPersonalizado). Nas solicitações, os documentos são
// identificados por uma chave: o próprio tipo nos padrão, "p_<id>" nos criados.
export type DocChave = string;
export type DocPersonalizado = {
  id: string;
  nome: string;
  descricao: string | null;
  extensoes: string[];
  maxMB: number;
  exigencia: DocumentoExigencia;
  excluidoEm: Date | string | null;
};

export type RegrasDoEmpreendimento = {
  nome: string;
  regrasDocumentos: { tipo: DocumentoTipo; exigencia: DocumentoExigencia }[];
  // Inclui os excluídos: o que já foi enviado com eles continua precisando de nome.
  documentosPersonalizados?: DocPersonalizado[];
};

// Formatos que a CAPE pode escolher para um documento criado por ela: todos têm a
// assinatura de conteúdo conferida no envio (upload-documento.ts).
export const FORMATOS_PERSONALIZADOS: { id: string; rotulo: string; extensoes: string[] }[] = [
  { id: "pdf", rotulo: "PDF", extensoes: [".pdf"] },
  { id: "dwg", rotulo: "DWG", extensoes: [".dwg"] },
  { id: "zip", rotulo: "ZIP", extensoes: [".zip"] },
  { id: "jpg", rotulo: "JPG", extensoes: [".jpg", ".jpeg"] },
  { id: "png", rotulo: "PNG", extensoes: [".png"] },
  { id: "word", rotulo: "Word", extensoes: [".doc", ".docx"] },
];
export const MAX_MB_PERSONALIZADO = 50;

export function chaveDoPersonalizado(id: string): DocChave {
  return `p_${id}`;
}

export function ehTipoPadrao(chave: string): chave is DocumentoTipo {
  return chave !== "PERSONALIZADO" && Object.hasOwn(DOC_LABEL, chave);
}

function personalizadosAtivos(emp: RegrasDoEmpreendimento) {
  return (emp.documentosPersonalizados ?? []).filter((d) => !d.excluidoEm);
}

export type InfoDoc = { nome: string; dica: string; extensoes: readonly string[]; maxMB: number };

// Nome, orientação e regra de arquivo de um documento, padrão ou criado pela CAPE.
export function infoDoc(chave: DocChave, emp: RegrasDoEmpreendimento): InfoDoc {
  if (ehTipoPadrao(chave)) return { nome: DOC_LABEL[chave].nome, dica: DOC_DICA[chave], ...DOC_REGRAS[chave] };
  const p = (emp.documentosPersonalizados ?? []).find((d) => chaveDoPersonalizado(d.id) === chave);
  if (!p) return { nome: DOC_LABEL.PERSONALIZADO.nome, dica: "", extensoes: [], maxMB: 0 };
  return { nome: p.nome, dica: p.descricao ?? "", extensoes: p.extensoes, maxMB: p.maxMB };
}

export function exigenciaDe(tipo: DocumentoTipo, emp: RegrasDoEmpreendimento): DocumentoExigencia {
  return emp.regrasDocumentos.find((r) => r.tipo === tipo)?.exigencia ?? exigenciaPadrao(tipo, emp.nome);
}

// Valem na hora, também para solicitações já enviadas: a CAPE muda a regra pensando no que
// quer conferir daqui para frente, inclusive no que está em análise.
export function docsObrigatorios(lotesAdicionais: number, emp: RegrasDoEmpreendimento): DocChave[] {
  const exigido = (e: DocumentoExigencia) => e === "OBRIGATORIO" || (e === "OBRIGATORIO_MAIS_LOTES" && lotesAdicionais > 0);
  return [
    ...DOC_TODOS.filter((t) => exigido(exigenciaDe(t, emp))),
    ...personalizadosAtivos(emp)
      .filter((d) => exigido(d.exigencia))
      .map((d) => chaveDoPersonalizado(d.id)),
  ];
}

// `enviados` (chaves): o que já foi anexado continua à vista mesmo que deixe de ser pedido.
export function docsOpcionais(lotesAdicionais: number, emp: RegrasDoEmpreendimento, enviados: DocChave[] = []): DocChave[] {
  const obrigatorios = docsObrigatorios(lotesAdicionais, emp);
  const padrao = DOC_TODOS.filter((t) => !obrigatorios.includes(t) && (exigenciaDe(t, emp) === "OPCIONAL" || enviados.includes(t)));
  const criados = (emp.documentosPersonalizados ?? [])
    .map((d) => ({ d, chave: chaveDoPersonalizado(d.id) }))
    .filter(({ d, chave }) => !obrigatorios.includes(chave) && ((!d.excluidoEm && d.exigencia === "OPCIONAL") || enviados.includes(chave)))
    .map(({ chave }) => chave);
  return [...padrao, ...criados];
}

// Formato e tamanho aceitos por documento. O projeto arquitetônico vem em dois campos: PDF
// para leitura e DWG para a CAPE conferir no CAD — vários DWG vão juntos num .zip, daí o
// limite maior. Os demais são leitura, então só PDF. OUTROS aceita imagem também, por ser
// o campo livre para o que não se encaixa nos demais.
export const DOC_REGRAS: Record<DocumentoTipo, { extensoes: readonly string[]; maxMB: number }> = {
  PROJETO_ARQUITETONICO: { extensoes: [".pdf"], maxMB: 5 },
  PROJETO_ARQUITETONICO_DWG: { extensoes: [".dwg", ".zip"], maxMB: 15 },
  ART_RRT_PROJETO: { extensoes: [".pdf"], maxMB: 5 },
  ART_RRT_EXECUCAO: { extensoes: [".pdf"], maxMB: 5 },
  MEMORIAL_DESCRITIVO: { extensoes: [".pdf"], maxMB: 5 },
  PROJETO_PAISAGISTICO: { extensoes: [".pdf", ".dwg"], maxMB: 5 },
  CAPA_IPTU: { extensoes: [".pdf"], maxMB: 5 },
  MATRICULA: { extensoes: [".pdf"], maxMB: 5 },
  LEVANTAMENTO_PLANIALTIMETRICO: { extensoes: [".pdf", ".dwg"], maxMB: 5 },
  PROJETO_APROVADO_PREFEITURA: { extensoes: [".pdf"], maxMB: 5 },
  ART_UNIFICACAO: { extensoes: [".pdf"], maxMB: 5 },
  TERMO_REGULAMENTO_ARQP: { extensoes: [".pdf"], maxMB: 5 },
  // Cada documento criado pela CAPE tem a sua regra (DocumentoPersonalizado).
  PERSONALIZADO: { extensoes: [], maxMB: 0 },
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

// Orientação mostrada ao RT ao anexar cada documento.
export const DOC_DICA: Record<DocumentoTipo, string> = {
  PROJETO_ARQUITETONICO: "Plantas, cortes, elevações e implantação no lote, em PDF",
  PROJETO_ARQUITETONICO_DWG:
    "O mesmo projeto em DWG, em qualquer versão do AutoCAD. Mais de um arquivo DWG: envie todos juntos numa pasta compactada (.zip)",
  ART_RRT_PROJETO: "Anotação de responsabilidade técnica quitada, do autor do projeto",
  ART_RRT_EXECUCAO: "Anotação de responsabilidade técnica quitada, de quem executa a obra",
  MEMORIAL_DESCRITIVO: "Materiais, acabamentos e sistema construtivo",
  PROJETO_PAISAGISTICO: "Implantação de jardins, paisagismo e áreas externas",
  CAPA_IPTU: "Capa do carnê ou guia do IPTU do lote",
  MATRICULA: "Matrícula atualizada do lote no cartório de registro de imóveis",
  LEVANTAMENTO_PLANIALTIMETRICO: "Levantamento planialtimétrico cadastral do lote",
  PROJETO_APROVADO_PREFEITURA: "Projeto aprovado previamente na Prefeitura, abrangendo todos os lotes",
  ART_UNIFICACAO: "Anotação de responsabilidade técnica da unificação dos lotes",
  TERMO_REGULAMENTO_ARQP: "Termo de ciência e concordância com o Regulamento de Obras da ARQP (item 1.53), assinado pelo responsável técnico pelo projeto",
  OUTROS: "Qualquer documento adicional relevante para a análise",
  PERSONALIZADO: "",
};

export function formatosAceitos(tipo: DocumentoTipo) {
  return formatosTexto(DOC_REGRAS[tipo].extensoes, DOC_REGRAS[tipo].maxMB);
}

export function formatosTexto(extensoes: readonly string[], maxMB: number) {
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

// Lotes além do principal num projeto que abrange mais de um, como o RT e o proprietário
// os leem: "Q2 L05 (aguardando conferência da CAPE), Q2 L06".
const LOTE_ADICIONAL_LABEL: Record<VinculoStatus, string> = {
  PENDENTE: "aguardando conferência da CAPE",
  APROVADO: "",
  RECUSADO: "recusado pela CAPE",
};

export function lotesAdicionaisTexto(lotes: { status: VinculoStatus; lote: { numero: string; quadra: { nome: string } } }[]) {
  return lotes
    .map((a) => `${a.lote.quadra.nome} L${a.lote.numero}${LOTE_ADICIONAL_LABEL[a.status] ? ` (${LOTE_ADICIONAL_LABEL[a.status]})` : ""}`)
    .join(", ");
}

export const CATEGORIA_DOC_TECNICO_LABEL: Record<DocumentoTecnicoCategoria, string> = {
  MANUAL_PROPRIETARIO: "Manual do proprietário",
  CONVENCAO_CONDOMINIO: "Convenção do condomínio",
  REGULAMENTO: "Regulamento",
  OUTRO: "Outro",
};

// Estas telas são renderizadas no servidor, que na Vercel roda em UTC — sem fixar o
// fuso, um evento das 22h de Brasília aparecia como 01h do dia seguinte. O fuso do
// empreendimento é o que interessa aqui, não o da máquina que renderiza.
const FUSO_BRASIL = "America/Sao_Paulo";

// Área de intervenção: sempre com duas casas decimais (1.250,00).
export function formatArea(m2: number): string {
  return m2.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

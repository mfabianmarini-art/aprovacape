import type { DocumentoTipo } from "@/generated/prisma/enums";
import { DOC_REGRAS } from "@/lib/status";

// Para onde vai um arquivo enviado direto do navegador ao Blob. Compartilhado entre o
// navegador (pasta, checagem rápida de formato/tamanho) e o servidor (autorização e
// registro), para os dois nunca divergirem. Todo upload do app passa por aqui: o corpo de
// uma requisição à função da Vercel não passa de 4,5 MB.
export type DestinoUpload =
  | { destino: "documento"; solicitacaoId: string; tipo: DocumentoTipo }
  | { destino: "devolutiva"; solicitacaoId: string }
  | { destino: "alvara"; solicitacaoId: string }
  | { destino: "evidencia"; solicitacaoId: string }
  | { destino: "vinculo"; usuarioId: string }
  | { destino: "tecnico"; empreendimentoId: string }
  | { destino: "planta"; empreendimentoId: string };

const MB = 1024 * 1024;
const IMAGENS = [".png", ".jpg", ".jpeg", ".webp"] as const;
const WORD = [".doc", ".docx"] as const;

export function regraDoDestino(d: DestinoUpload): { pasta: string; extensoes: readonly string[]; maxBytes: number } {
  switch (d.destino) {
    case "documento":
      return { pasta: `documentos/${d.solicitacaoId}/`, extensoes: DOC_REGRAS[d.tipo].extensoes, maxBytes: DOC_REGRAS[d.tipo].maxMB * MB };
    case "devolutiva":
      return { pasta: `documentos/devolutivas/${d.solicitacaoId}/`, extensoes: [".dwg", ".zip", ".pdf"], maxBytes: 15 * MB };
    case "alvara":
      return { pasta: `documentos/alvaras/${d.solicitacaoId}/`, extensoes: [".pdf"], maxBytes: 5 * MB };
    case "evidencia":
      return { pasta: `documentos/irregularidades/${d.solicitacaoId}/`, extensoes: [...IMAGENS, ".pdf"], maxBytes: 5 * MB };
    case "vinculo":
      return { pasta: `documentos/vinculos/${d.usuarioId}/`, extensoes: [".pdf", ...WORD, ...IMAGENS], maxBytes: 10 * MB };
    case "tecnico":
      return { pasta: `documentos/tecnicos/${d.empreendimentoId}/`, extensoes: [".pdf", ...WORD, ...IMAGENS], maxBytes: 20 * MB };
    case "planta":
      return { pasta: `plantas/${d.empreendimentoId}/`, extensoes: IMAGENS, maxBytes: 10 * MB };
  }
}

// Imagens que o navegador reduz antes de enviar (foto de celular de 4–8 MB vira algumas
// centenas de KB). A planta pode ser maior: é o mapa, precisa de detalhe.
export function ladoMaximoDaImagem(d: DestinoUpload): number | null {
  if (d.destino === "planta") return 4096;
  if (d.destino === "evidencia" || d.destino === "documento" || d.destino === "vinculo" || d.destino === "tecnico") return 2000;
  return null;
}

export function extensaoDoNome(nome: string) {
  const i = nome.lastIndexOf(".");
  return i === -1 ? "" : nome.slice(i).toLowerCase();
}

// Checagem no navegador antes de subir: mensagem precisa na hora, sem esperar o envio.
export function problemaAntesDeEnviar(file: File, d: DestinoUpload): string | null {
  const regra = regraDoDestino(d);
  if (!regra.extensoes.includes(extensaoDoNome(file.name))) {
    return `Formato não aceito — envie ${regra.extensoes.map((e) => e.slice(1).toUpperCase()).join(", ")}.`;
  }
  if (file.size > regra.maxBytes) return `Arquivo maior que ${regra.maxBytes / MB} MB.`;
  if (file.size === 0) return "Arquivo vazio.";
  return null;
}

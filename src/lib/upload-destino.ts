import type { DocumentoTipo } from "@/generated/prisma/enums";
import { DOC_REGRAS } from "@/lib/status";

// Para onde vai um arquivo enviado direto do navegador ao Blob. Compartilhado entre o
// navegador (pasta, checagem rápida de formato/tamanho) e o servidor (autorização e
// registro), para os dois nunca divergirem.
export type DestinoUpload =
  | { destino: "documento"; solicitacaoId: string; tipo: DocumentoTipo }
  | { destino: "devolutiva"; solicitacaoId: string }
  | { destino: "alvara"; solicitacaoId: string };

const MB = 1024 * 1024;

export function regraDoDestino(d: DestinoUpload): { pasta: string; extensoes: readonly string[]; maxBytes: number } {
  switch (d.destino) {
    case "documento":
      return { pasta: `documentos/${d.solicitacaoId}/`, extensoes: DOC_REGRAS[d.tipo].extensoes, maxBytes: DOC_REGRAS[d.tipo].maxMB * MB };
    case "devolutiva":
      return { pasta: `documentos/devolutivas/${d.solicitacaoId}/`, extensoes: [".dwg", ".zip", ".pdf"], maxBytes: 15 * MB };
    case "alvara":
      return { pasta: `documentos/alvaras/${d.solicitacaoId}/`, extensoes: [".pdf"], maxBytes: 5 * MB };
  }
}

export function extensaoDoNome(nome: string) {
  const i = nome.lastIndexOf(".");
  return i === -1 ? "" : nome.slice(i).toLowerCase();
}

// Checagem no navegador antes de subir: mensagem precisa na hora, sem esperar o envio.
export function problemaAntesDeEnviar(file: File, d: DestinoUpload): string | null {
  const regra = regraDoDestino(d);
  if (!regra.extensoes.includes(extensaoDoNome(file.name))) {
    return `Formato não aceito — envie ${regra.extensoes.map((e) => e.slice(1).toUpperCase()).join(" ou ")}.`;
  }
  if (file.size > regra.maxBytes) return `Arquivo maior que ${regra.maxBytes / MB} MB.`;
  if (file.size === 0) return "Arquivo vazio.";
  return null;
}

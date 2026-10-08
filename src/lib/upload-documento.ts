import type { DocumentoTipo } from "@/generated/prisma/enums";
import { DOC_REGRAS, formatosAceitos } from "@/lib/status";

export function extensaoDe(nome: string) {
  const i = nome.lastIndexOf(".");
  return i === -1 ? "" : nome.slice(i).toLowerCase();
}

// O tipo informado pelo navegador não é confiável para DWG (costuma vir vazio ou
// application/octet-stream), então quem manda é a extensão validada no upload. Servir o
// tipo declarado por quem envia permitiria entregar HTML na origem do app.
const TIPO_POR_EXTENSAO: Record<string, string> = {
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export function contentTypeDe(nomeArquivo: string) {
  return TIPO_POR_EXTENSAO[extensaoDe(nomeArquivo)] ?? "application/octet-stream";
}

// Confere um documento pelo nome, tamanho e primeiros bytes — o arquivo já está no Blob
// (vai direto do navegador), então a conferência é feita depois do envio.
export function validarDocumentoEnviado(arq: { nome: string; tamanho: number; inicio: Uint8Array }, tipo: DocumentoTipo): string | null {
  const regra = DOC_REGRAS[tipo];
  const ext = extensaoDe(arq.nome);

  if (!regra.extensoes.includes(ext)) return `Formato não aceito para este documento — envie ${formatosAceitos(tipo)}.`;
  if (arq.tamanho > regra.maxMB * 1024 * 1024) return `Arquivo maior que ${regra.maxMB} MB.`;

  // Qualquer versão do AutoCAD serve; só se confere que é mesmo um DWG, cujo arquivo
  // começa pelo código da versão que o gravou ("AC1009" … "AC1032").
  if (ext === ".dwg" && !/^AC1\d{3}$/.test(new TextDecoder().decode(arq.inicio.slice(0, 6)))) {
    return "O arquivo não parece ser um DWG válido. Confira o arquivo e envie novamente.";
  }

  // Um .zip começa por PK\x03\x04. Não abrimos o pacote para conferir a versão de cada DWG
  // dentro dele.
  if (ext === ".zip" && !ehZip(arq.inicio)) {
    return "Arquivo .zip inválido ou vazio. Compacte os arquivos DWG numa pasta .zip e envie novamente.";
  }

  return null;
}

export function ehZip(inicio: Uint8Array) {
  return inicio[0] === 0x50 && inicio[1] === 0x4b && inicio[2] === 0x03 && inicio[3] === 0x04;
}

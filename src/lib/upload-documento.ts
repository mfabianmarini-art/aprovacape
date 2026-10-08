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
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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

  if (!conteudoConfere(arq.nome, arq.inicio)) {
    return `O conteúdo do arquivo não é um ${ext.slice(1).toUpperCase()} válido. Confira o arquivo e envie novamente.`;
  }

  return null;
}

export function ehZip(inicio: Uint8Array) {
  return inicio[0] === 0x50 && inicio[1] === 0x4b && inicio[2] === 0x03 && inicio[3] === 0x04;
}

// O formato é conferido pelo conteúdo, não pelo nome nem pelo tipo que o navegador
// declarou: um HTML renomeado para .pdf não passa. Cada formato começa por uma assinatura.
const ASSINATURAS: Record<string, (b: Uint8Array) => boolean> = {
  ".pdf": (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46, // %PDF
  ".png": (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  ".jpg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  ".jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  ".webp": (b) => new TextDecoder().decode(b.slice(0, 4)) === "RIFF" && new TextDecoder().decode(b.slice(8, 12)) === "WEBP",
  ".zip": ehZip,
  ".docx": ehZip, // .docx é um pacote zip
  ".doc": (b) => b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0, // OLE2
  ".dwg": (b) => /^AC1\d{3}$/.test(new TextDecoder().decode(b.slice(0, 6))),
};

export function conteudoConfere(nome: string, inicio: Uint8Array) {
  const confere = ASSINATURAS[extensaoDe(nome)];
  return !!confere && confere(inicio);
}

import type { DocumentoTipo } from "@/generated/prisma/enums";
import { DOC_REGRAS, formatosAceitos } from "@/lib/status";

// Um DWG começa com o código da versão que o gravou. A CAPE abre os projetos em
// AutoCAD 2010, então versões posteriores são recusadas na origem — o erro diz
// exatamente o que refazer, em vez de o analista descobrir só ao tentar abrir.
const DWG_ATE_2010 = new Set(["AC1009", "AC1012", "AC1014", "AC1015", "AC1018", "AC1021", "AC1024"]);
const DWG_VERSAO_NOME: Record<string, string> = {
  AC1027: "AutoCAD 2013",
  AC1032: "AutoCAD 2018 ou posterior",
};

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

  if (ext === ".dwg") {
    const versao = new TextDecoder().decode(arq.inicio.slice(0, 6));
    if (!DWG_ATE_2010.has(versao)) {
      const nome = DWG_VERSAO_NOME[versao] ?? "uma versão posterior";
      return `DWG salvo em ${nome}. Salve como "AutoCAD 2010/LT2010 Desenho" e envie novamente.`;
    }
  }

  // Um .zip começa por PK\x03\x04. Não abrimos o pacote para conferir a versão de cada DWG
  // dentro dele: a mensagem do campo pede AutoCAD 2010, e o analista confere ao abrir.
  if (ext === ".zip" && !ehZip(arq.inicio)) {
    return "Arquivo .zip inválido ou vazio. Compacte os arquivos DWG numa pasta .zip e envie novamente.";
  }

  return null;
}

export function ehZip(inicio: Uint8Array) {
  return inicio[0] === 0x50 && inicio[1] === 0x4b && inicio[2] === 0x03 && inicio[3] === 0x04;
}

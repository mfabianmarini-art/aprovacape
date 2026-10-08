import { upload } from "@vercel/blob/client";
import { extensaoDoNome, ladoMaximoDaImagem, problemaAntesDeEnviar, regraDoDestino, type DestinoUpload } from "@/lib/upload-destino";

export type ArquivoEnviado = { pathname: string; nomeArquivo: string; hash: string };
export type ArquivoPreparado = { arquivo: File; hash: string; problema: string | null };

// Antes de subir: imagens grandes são reduzidas no próprio navegador (foto de celular de
// 4–8 MB vira algumas centenas de KB, sem perda visível para análise) e o arquivo ganha
// sua impressão digital (SHA-256), que detecta reenvio de arquivo idêntico. A checagem de
// formato/tamanho vem depois da redução — uma foto de 8 MB que cai para 600 KB passa.
export async function prepararEnvio(file: File, d: DestinoUpload): Promise<ArquivoPreparado> {
  const lado = ladoMaximoDaImagem(d);
  const arquivo = lado ? await reduzirImagem(file, lado, d.destino === "planta" ? "image/webp" : "image/jpeg") : file;
  const problema = problemaAntesDeEnviar(arquivo, d);
  return { arquivo, problema, hash: problema ? "" : await sha256(arquivo) };
}

// O arquivo vai do navegador direto ao Blob: passar pela função da Vercel limita o corpo
// da requisição a 4,5 MB. O servidor só emite um token curto para este caminho
// (/api/blob-upload) e depois registra e confere o arquivo.
export async function enviarDireto(p: ArquivoPreparado, d: DestinoUpload, onProgresso?: (pct: number) => void): Promise<ArquivoEnviado> {
  const file = p.arquivo;
  const pathname = `${regraDoDestino(d).pasta}${crypto.randomUUID()}${extensaoDoNome(file.name)}`;
  const r = await upload(pathname, file, {
    access: "private",
    handleUploadUrl: "/api/blob-upload",
    clientPayload: JSON.stringify(d),
    multipart: file.size > 8 * 1024 * 1024,
    onUploadProgress: onProgresso ? (pr) => onProgresso(Math.round(pr.percentage)) : undefined,
  });
  return { pathname: r.pathname, nomeArquivo: file.name, hash: p.hash };
}

export function mensagemDeFalhaNoEnvio(e: unknown) {
  console.error("[upload]", e);
  return "Não foi possível enviar o arquivo. Verifique a conexão e tente de novo.";
}

async function sha256(file: Blob) {
  try {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return ""; // sem hash só se perde a detecção de duplicado
  }
}

const REDUZ_ACIMA_DE = 1.5 * 1024 * 1024;

async function reduzirImagem(file: File, ladoMax: number, tipo: "image/jpeg" | "image/webp"): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const bmp = await createImageBitmap(file).catch(() => null); // já respeita a orientação EXIF
  if (!bmp) return file;
  const escala = Math.min(1, ladoMax / Math.max(bmp.width, bmp.height));
  if (escala === 1 && file.size <= REDUZ_ACIMA_DE) {
    bmp.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * escala);
  canvas.height = Math.round(bmp.height * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#fff"; // JPEG não tem transparência: fundo branco em vez de preto
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, tipo, tipo === "image/webp" ? 0.88 : 0.82));
  // Só troca se ficou menor de fato (um PNG pequeno pode crescer como JPEG).
  if (!blob || blob.size >= file.size) return file;
  const base = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${base}${tipo === "image/webp" ? ".webp" : ".jpg"}`, { type: tipo, lastModified: file.lastModified });
}

export class ProblemaNoArquivo extends Error {}

// Vários arquivos para o mesmo destino (evidências): prepara todos antes de subir qualquer
// um — um arquivo recusado não deixa os outros enviados à toa — e sobe em sequência, com
// progresso do conjunto.
export async function enviarVarios(files: File[], d: DestinoUpload, onProgresso?: (pct: number) => void): Promise<ArquivoEnviado[]> {
  const preparados = await Promise.all(files.map((f) => prepararEnvio(f, d)));
  const ruim = preparados.findIndex((p) => p.problema);
  if (ruim >= 0) throw new ProblemaNoArquivo(`"${files[ruim].name}": ${preparados[ruim].problema}`);
  const total = preparados.reduce((a, p) => a + p.arquivo.size, 0) || 1;
  let feito = 0;
  const enviados: ArquivoEnviado[] = [];
  for (const p of preparados) {
    enviados.push(await enviarDireto(p, d, (pct) => onProgresso?.(Math.round(((feito + (p.arquivo.size * pct) / 100) / total) * 100))));
    feito += p.arquivo.size;
  }
  return enviados;
}

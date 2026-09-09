import { put } from "@vercel/blob";
import path from "node:path";
import crypto from "node:crypto";

export async function saveUploadedFile(file: File, subdir: string) {
  const ext = path.extname(file.name) || "";
  const pathname = `documentos/${subdir}/${crypto.randomUUID()}${ext}`;
  const blob = await put(pathname, file, { access: "private", contentType: file.type });

  return { caminhoArquivo: blob.pathname, tamanhoBytes: file.size, nomeArquivo: file.name };
}

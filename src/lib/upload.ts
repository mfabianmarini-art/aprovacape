import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./uploads";

export async function saveUploadedFile(file: File, subdir: string) {
  // Path is env-configurable at runtime, so bundlers can't trace it statically —
  // ignored deliberately (see Turbopack "Dynamic filesystem access" warning).
  const dir = path.join(/*turbopackIgnore: true*/ UPLOADS_DIR, subdir);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || "";
  const safeName = `${crypto.randomUUID()}${ext}`;
  const fullPath = path.join(/*turbopackIgnore: true*/ dir, safeName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);

  return { caminhoArquivo: fullPath, tamanhoBytes: buffer.byteLength, nomeArquivo: file.name };
}

export function resolveUploadPath(caminhoArquivo: string) {
  return path.resolve(caminhoArquivo);
}

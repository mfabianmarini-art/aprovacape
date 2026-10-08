import { upload } from "@vercel/blob/client";
import { extensaoDoNome, regraDoDestino, type DestinoUpload } from "@/lib/upload-destino";

export type ArquivoEnviado = { pathname: string; nomeArquivo: string };

// O arquivo vai do navegador direto ao Blob: passar pela função da Vercel limita o corpo
// da requisição a 4,5 MB, e projetos em DWG passam disso com folga. O servidor só emite
// um token curto para este caminho (/api/blob-upload) e depois registra e confere o arquivo.
export async function enviarDireto(file: File, d: DestinoUpload, onProgresso?: (pct: number) => void): Promise<ArquivoEnviado> {
  const pathname = `${regraDoDestino(d).pasta}${crypto.randomUUID()}${extensaoDoNome(file.name)}`;
  const r = await upload(pathname, file, {
    access: "private",
    handleUploadUrl: "/api/blob-upload",
    clientPayload: JSON.stringify(d),
    multipart: file.size > 8 * 1024 * 1024,
    onUploadProgress: onProgresso ? (p) => onProgresso(Math.round(p.percentage)) : undefined,
  });
  return { pathname: r.pathname, nomeArquivo: file.name };
}

export function mensagemDeFalhaNoEnvio(e: unknown) {
  console.error("[upload]", e);
  return "Não foi possível enviar o arquivo. Verifique a conexão e tente de novo.";
}

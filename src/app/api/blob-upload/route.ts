import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { autorizarUpload } from "@/lib/upload-direto";

// Emite o token para o navegador subir o arquivo direto ao Blob (ver upload-cliente.ts).
// O registro no banco é feito depois, pela action de cada tela, que confere o arquivo.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const resposta = await handleUpload({ body, request, onBeforeGenerateToken: autorizarUpload });
    return NextResponse.json(resposta);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload não autorizado." }, { status: 400 });
  }
}

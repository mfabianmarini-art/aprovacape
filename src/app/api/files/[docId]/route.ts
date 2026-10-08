import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contentTypeDe } from "@/lib/upload-documento";
import { contentDisposition } from "@/lib/content-disposition";
import { INCLUI_LOTE_E_SINDICO, podeVerArquivosDaSolicitacao } from "@/lib/acesso-arquivos";

export async function GET(_req: Request, { params }: { params: Promise<{ docId: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const { docId } = await params;
  const doc = await prisma.solicitacaoDocumento.findUnique({
    where: { id: docId },
    include: { solicitacao: { include: INCLUI_LOTE_E_SINDICO } },
  });
  if (!doc) return new NextResponse("Não encontrado.", { status: 404 });

  if (!podeVerArquivosDaSolicitacao(session.user, doc.solicitacao)) return new NextResponse("Sem permissão.", { status: 403 });

  const result = await get(doc.caminhoArquivo, { access: "private" }).catch(() => null);
  if (!result) return new NextResponse("Arquivo indisponível.", { status: 404 });

  // Tipo derivado da extensão validada no upload, nunca do que o navegador declarou —
  // servir um Content-Type escolhido por quem envia viraria XSS na origem do app.
  const contentType = contentTypeDe(doc.nomeArquivo);
  const disposicao = contentType === "application/pdf" ? "inline" : "attachment";

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition(disposicao, doc.nomeArquivo),
    },
  });
}

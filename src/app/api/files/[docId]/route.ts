import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contentTypeDe } from "@/lib/upload-documento";

export async function GET(_req: Request, { params }: { params: Promise<{ docId: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const { docId } = await params;
  const doc = await prisma.solicitacaoDocumento.findUnique({
    where: { id: docId },
    include: { solicitacao: { include: { lote: true } } },
  });
  if (!doc) return new NextResponse("Não encontrado.", { status: 404 });

  const { lote } = doc.solicitacao;
  const podeVer =
    session.user.role === "ADMIN_CAPE" ||
    session.user.role === "CAPE_ANALISTA" ||
    session.user.role === "SINDICO" ||
    // Autor do protocolo continua lendo o que enviou mesmo depois de perder o vínculo:
    // o lote guarda um único RT, e a troca de profissional não apaga o que o anterior
    // protocolou. Ler o próprio envio não é agir sobre a solicitação.
    doc.solicitacao.criadoPorId === session.user.id ||
    lote.proprietarioId === session.user.id ||
    lote.rtId === session.user.id;
  if (!podeVer) return new NextResponse("Sem permissão.", { status: 403 });

  const result = await get(doc.caminhoArquivo, { access: "private" }).catch(() => null);
  if (!result) return new NextResponse("Arquivo indisponível.", { status: 404 });

  // Tipo derivado da extensão validada no upload, nunca do que o navegador declarou —
  // servir um Content-Type escolhido por quem envia viraria XSS na origem do app.
  const contentType = contentTypeDe(doc.nomeArquivo);
  const disposicao = contentType === "application/pdf" ? "inline" : "attachment";

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${disposicao}; filename="${doc.nomeArquivo}"`,
    },
  });
}

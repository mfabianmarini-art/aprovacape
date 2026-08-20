import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    session.user.role === "CAPE_ANALISTA" ||
    session.user.role === "SINDICO" ||
    lote.proprietarioId === session.user.id ||
    lote.rtId === session.user.id;
  if (!podeVer) return new NextResponse("Sem permissão.", { status: 403 });

  try {
    const buffer = await readFile(doc.caminhoArquivo);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.nomeArquivo}"`,
      },
    });
  } catch {
    return new NextResponse("Arquivo indisponível.", { status: 404 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { servirArquivo } from "@/lib/servir-arquivo";
import { INCLUI_LOTE_E_SINDICO, podeVerArquivosDaSolicitacao } from "@/lib/acesso-arquivos";

// Documento atual de uma solicitação. Versões anteriores: /api/arquivos/[id].
export async function GET(req: Request, { params }: { params: Promise<{ docId: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const { docId } = await params;
  const doc = await prisma.solicitacaoDocumento.findUnique({
    where: { id: docId },
    include: { solicitacao: { include: INCLUI_LOTE_E_SINDICO } },
  });
  if (!doc) return new NextResponse("Não encontrado.", { status: 404 });
  if (!podeVerArquivosDaSolicitacao(session.user, doc.solicitacao)) return new NextResponse("Sem permissão.", { status: 403 });

  return servirArquivo(req, { caminho: doc.caminhoArquivo, nome: doc.nomeArquivo, usuarioId: session.user.id });
}

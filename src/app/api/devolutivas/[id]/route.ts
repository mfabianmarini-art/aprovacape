import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { servirArquivo } from "@/lib/servir-arquivo";
import { INCLUI_LOTE_E_SINDICO, podeVerArquivosDaSolicitacao } from "@/lib/acesso-arquivos";

// Arquivo de apontamentos que a CAPE mandou ao RT com o parecer. Mesmo alcance dos
// documentos da solicitação. Não é exposto em /acompanhar.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const { id } = await params;
  const dev = await prisma.devolutivaTecnica.findUnique({ where: { id }, include: { solicitacao: { include: INCLUI_LOTE_E_SINDICO } } });
  if (!dev?.arquivoCaminho || !dev.arquivoNome) return new NextResponse("Não encontrado.", { status: 404 });
  if (!podeVerArquivosDaSolicitacao(session.user, dev.solicitacao)) return new NextResponse("Sem permissão.", { status: 403 });

  return servirArquivo(req, { caminho: dev.arquivoCaminho, nome: dev.arquivoNome, usuarioId: session.user.id });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { servirArquivo } from "@/lib/servir-arquivo";
import { INCLUI_LOTE_E_SINDICO, podeVerArquivosDaSolicitacao } from "@/lib/acesso-arquivos";

export async function GET(req: Request, { params }: { params: Promise<{ solicitacaoId: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const { solicitacaoId } = await params;
  const sol = await prisma.solicitacao.findUnique({ where: { id: solicitacaoId }, include: INCLUI_LOTE_E_SINDICO });
  if (!sol?.alvaraCaminho) return new NextResponse("Não encontrado.", { status: 404 });
  if (!podeVerArquivosDaSolicitacao(session.user, sol)) return new NextResponse("Sem permissão.", { status: 403 });

  return servirArquivo(req, { caminho: sol.alvaraCaminho, nome: sol.alvaraNome ?? "alvara.pdf", usuarioId: session.user.id });
}

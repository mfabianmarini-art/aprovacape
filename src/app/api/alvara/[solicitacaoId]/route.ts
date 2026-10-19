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
  // ?arquivo=art: a ART/RRT de execução enviada junto com o alvará.
  const art = new URL(req.url).searchParams.get("arquivo") === "art";
  const caminho = art ? sol?.alvaraArtCaminho : sol?.alvaraCaminho;
  if (!sol || !caminho) return new NextResponse("Não encontrado.", { status: 404 });
  if (!podeVerArquivosDaSolicitacao(session.user, sol)) return new NextResponse("Sem permissão.", { status: 403 });

  const nome = (art ? sol.alvaraArtNome : sol.alvaraNome) ?? (art ? "art-execucao.pdf" : "alvara.pdf");
  return servirArquivo(req, { caminho, nome, usuarioId: session.user.id });
}

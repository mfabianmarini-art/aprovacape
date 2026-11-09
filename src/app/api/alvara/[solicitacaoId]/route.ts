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
  // ?arquivo=art ou ?arquivo=projeto: o que foi enviado junto com o alvará.
  const arquivo = new URL(req.url).searchParams.get("arquivo");
  const doc =
    arquivo === "art"
      ? { caminho: sol?.alvaraArtCaminho, nome: sol?.alvaraArtNome, padrao: "art-execucao.pdf" }
      : arquivo === "projeto"
        ? { caminho: sol?.alvaraProjetoCaminho, nome: sol?.alvaraProjetoNome, padrao: "projeto-carimbado.pdf" }
        : { caminho: sol?.alvaraCaminho, nome: sol?.alvaraNome, padrao: "alvara.pdf" };
  if (!sol || !doc.caminho) return new NextResponse("Não encontrado.", { status: 404 });
  if (!podeVerArquivosDaSolicitacao(session.user, sol)) return new NextResponse("Sem permissão.", { status: 403 });

  return servirArquivo(req, { caminho: doc.caminho, nome: doc.nome ?? doc.padrao, usuarioId: session.user.id });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { servirArquivo } from "@/lib/servir-arquivo";
import { INCLUI_LOTE_E_SINDICO, podeVerArquivosDaSolicitacao } from "@/lib/acesso-arquivos";

// A evidência sustenta a notificação, então alcança quem ela envolve.
export async function GET(req: Request, { params }: { params: Promise<{ evidenciaId: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const { evidenciaId } = await params;
  const ev = await prisma.irregularidadeEvidencia.findUnique({
    where: { id: evidenciaId },
    include: { irregularidade: { include: { solicitacao: { include: INCLUI_LOTE_E_SINDICO } } } },
  });
  if (!ev) return new NextResponse("Não encontrado.", { status: 404 });
  if (!podeVerArquivosDaSolicitacao(session.user, ev.irregularidade.solicitacao)) return new NextResponse("Sem permissão.", { status: 403 });

  return servirArquivo(req, { caminho: ev.caminhoArquivo, nome: ev.nomeArquivo, usuarioId: session.user.id });
}

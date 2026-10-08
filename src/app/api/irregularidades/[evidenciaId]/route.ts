import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contentTypeDe } from "@/lib/upload-documento";
import { contentDisposition } from "@/lib/content-disposition";
import { INCLUI_LOTE_E_SINDICO, podeVerArquivosDaSolicitacao } from "@/lib/acesso-arquivos";

// A evidência sustenta a notificação, então alcança quem ela envolve: a CAPE, o síndico
// do empreendimento e o proprietário/RT do lote.
export async function GET(_req: Request, { params }: { params: Promise<{ evidenciaId: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const { evidenciaId } = await params;
  const ev = await prisma.irregularidadeEvidencia.findUnique({
    where: { id: evidenciaId },
    include: {
      irregularidade: {
        include: { solicitacao: { include: INCLUI_LOTE_E_SINDICO } },
      },
    },
  });
  if (!ev) return new NextResponse("Não encontrado.", { status: 404 });

  if (!podeVerArquivosDaSolicitacao(session.user, ev.irregularidade.solicitacao)) return new NextResponse("Sem permissão.", { status: 403 });

  const result = await get(ev.caminhoArquivo, { access: "private" }).catch(() => null);
  if (!result) return new NextResponse("Arquivo indisponível.", { status: 404 });

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": contentTypeDe(ev.nomeArquivo),
      "Content-Disposition": contentDisposition("inline", ev.nomeArquivo),
    },
  });
}

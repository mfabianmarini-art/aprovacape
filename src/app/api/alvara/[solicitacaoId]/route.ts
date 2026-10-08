import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contentDisposition } from "@/lib/content-disposition";
import { INCLUI_LOTE_E_SINDICO, podeVerArquivosDaSolicitacao } from "@/lib/acesso-arquivos";

export async function GET(_req: Request, { params }: { params: Promise<{ solicitacaoId: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const { solicitacaoId } = await params;
  const sol = await prisma.solicitacao.findUnique({ where: { id: solicitacaoId }, include: INCLUI_LOTE_E_SINDICO });
  if (!sol?.alvaraCaminho) return new NextResponse("Não encontrado.", { status: 404 });

  if (!podeVerArquivosDaSolicitacao(session.user, sol)) return new NextResponse("Sem permissão.", { status: 403 });

  const result = await get(sol.alvaraCaminho, { access: "private" }).catch(() => null);
  if (!result) return new NextResponse("Arquivo indisponível.", { status: 404 });

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition("inline", sol.alvaraNome ?? "alvara.pdf"),
    },
  });
}

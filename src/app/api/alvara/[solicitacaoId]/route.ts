import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ solicitacaoId: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const { solicitacaoId } = await params;
  const sol = await prisma.solicitacao.findUnique({ where: { id: solicitacaoId }, include: { lote: true } });
  if (!sol?.alvaraCaminho) return new NextResponse("Não encontrado.", { status: 404 });

  const role = session.user.role;
  const podeVer =
    role === "ADMIN_CAPE" ||
    role === "CAPE_ANALISTA" ||
    role === "SINDICO" ||
    sol.lote.proprietarioId === session.user.id ||
    sol.lote.rtId === session.user.id;
  if (!podeVer) return new NextResponse("Sem permissão.", { status: 403 });

  const result = await get(sol.alvaraCaminho, { access: "private" }).catch(() => null);
  if (!result) return new NextResponse("Arquivo indisponível.", { status: 404 });

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${sol.alvaraNome ?? "alvara.pdf"}"`,
    },
  });
}

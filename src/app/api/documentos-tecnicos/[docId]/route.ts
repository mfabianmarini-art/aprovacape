import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ docId: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const { docId } = await params;
  const doc = await prisma.documentoTecnico.findUnique({ where: { id: docId } });
  if (!doc) return new NextResponse("Não encontrado.", { status: 404 });

  const role = session.user.role;
  let podeVer = role === "ADMIN_CAPE" || role === "CAPE_ANALISTA";
  if (!podeVer && role === "SINDICO") {
    const emp = await prisma.empreendimento.findUnique({ where: { id: doc.empreendimentoId } });
    podeVer = emp?.sindicoId === session.user.id;
  }
  if (!podeVer && (role === "PROPRIETARIO" || role === "RESPONSAVEL_TECNICO")) {
    const lote = await prisma.lote.findFirst({
      where: {
        empreendimentoId: doc.empreendimentoId,
        OR: [{ proprietarioId: session.user.id }, { rtId: session.user.id }],
      },
    });
    podeVer = !!lote;
  }
  if (!podeVer) return new NextResponse("Sem permissão.", { status: 403 });

  const result = await get(doc.caminhoArquivo, { access: "private" }).catch(() => null);
  if (!result) return new NextResponse("Arquivo indisponível.", { status: 404 });

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${doc.nomeArquivo}"`,
    },
  });
}

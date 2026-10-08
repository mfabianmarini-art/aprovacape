import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contentTypeDe } from "@/lib/upload-documento";
import { contentDisposition } from "@/lib/content-disposition";

// Arquivo de apontamentos que a CAPE mandou ao RT com o parecer. Mesmo alcance dos
// documentos da solicitação (/api/files): CAPE, síndico, autor do protocolo e quem está
// vinculado ao lote. Não é exposto em /acompanhar.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const { id } = await params;
  const dev = await prisma.devolutivaTecnica.findUnique({
    where: { id },
    include: { solicitacao: { include: { lote: true } } },
  });
  if (!dev?.arquivoCaminho || !dev.arquivoNome) return new NextResponse("Não encontrado.", { status: 404 });

  const { lote } = dev.solicitacao;
  const role = session.user.role;
  const podeVer =
    role === "ADMIN_CAPE" ||
    role === "CAPE_ANALISTA" ||
    role === "SINDICO" ||
    dev.solicitacao.criadoPorId === session.user.id ||
    lote.proprietarioId === session.user.id ||
    lote.rtId === session.user.id;
  if (!podeVer) return new NextResponse("Sem permissão.", { status: 403 });

  const result = await get(dev.arquivoCaminho, { access: "private" }).catch(() => null);
  if (!result) return new NextResponse("Arquivo indisponível.", { status: 404 });

  const contentType = contentTypeDe(dev.arquivoNome);
  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition(contentType === "application/pdf" ? "inline" : "attachment", dev.arquivoNome),
    },
  });
}

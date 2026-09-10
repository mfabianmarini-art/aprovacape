import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// A autorização do proprietário é documento de análise do vínculo: só a equipe CAPE,
// que aprova ou recusa, e o próprio autor do envio podem abrir.
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const { userId } = await params;
  const podeVer =
    session.user.role === "ADMIN_CAPE" || session.user.role === "CAPE_ANALISTA" || session.user.id === userId;
  if (!podeVer) return new NextResponse("Sem permissão.", { status: 403 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.vinculoArquivoCaminho) return new NextResponse("Não encontrado.", { status: 404 });

  const result = await get(user.vinculoArquivoCaminho, { access: "private" }).catch(() => null);
  if (!result) return new NextResponse("Arquivo indisponível.", { status: 404 });

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${user.vinculoArquivoNome ?? "autorizacao"}"`,
    },
  });
}

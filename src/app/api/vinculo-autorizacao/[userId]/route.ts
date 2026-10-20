import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { servirArquivo } from "@/lib/servir-arquivo";

// Documentos do pedido de vínculo — procuração (padrão), ?doc=proprietario (RG/CNH do
// proprietário) e ?doc=rt (RG/CNH do RT). São de análise do vínculo: só a equipe CAPE,
// que aprova ou recusa, e o próprio autor do envio podem abrir.
export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const { userId } = await params;
  const podeVer = session.user.role === "ADMIN_CAPE" || session.user.role === "CAPE_ANALISTA" || session.user.id === userId;
  if (!podeVer) return new NextResponse("Sem permissão.", { status: 403 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return new NextResponse("Não encontrado.", { status: 404 });
  const doc = new URL(req.url).searchParams.get("doc");
  const [caminho, nome] =
    doc === "proprietario"
      ? [user.vinculoDocPropCaminho, user.vinculoDocPropNome ?? "documento-proprietario"]
      : doc === "rt"
        ? [user.vinculoDocRtCaminho, user.vinculoDocRtNome ?? "documento-rt"]
        : [user.vinculoArquivoCaminho, user.vinculoArquivoNome ?? "procuracao"];
  if (!caminho) return new NextResponse("Não encontrado.", { status: 404 });

  return servirArquivo(req, { caminho, nome, usuarioId: session.user.id });
}

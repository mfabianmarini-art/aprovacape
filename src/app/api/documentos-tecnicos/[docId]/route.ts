import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { servirArquivo } from "@/lib/servir-arquivo";
import { podeVerArquivosDoEmpreendimento } from "@/lib/acesso-arquivos";

export async function GET(req: Request, { params }: { params: Promise<{ docId: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const { docId } = await params;
  const doc = await prisma.documentoTecnico.findUnique({ where: { id: docId } });
  if (!doc) return new NextResponse("Não encontrado.", { status: 404 });
  if (!(await podeVerArquivosDoEmpreendimento(session.user, doc.empreendimentoId))) return new NextResponse("Sem permissão.", { status: 403 });

  return servirArquivo(req, { caminho: doc.caminhoArquivo, nome: doc.nomeArquivo, usuarioId: session.user.id });
}

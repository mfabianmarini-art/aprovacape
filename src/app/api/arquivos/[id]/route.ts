import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { servirArquivo } from "@/lib/servir-arquivo";
import { podeVerArquivo } from "@/lib/acesso-arquivos";

// Qualquer arquivo do inventário pelo id — inclusive versões substituídas, que por
// contrato continuam disponíveis.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const { id } = await params;
  const arquivo = await prisma.arquivo.findUnique({ where: { id } });
  if (!arquivo) return new NextResponse("Não encontrado.", { status: 404 });
  if (!(await podeVerArquivo(session.user, arquivo))) return new NextResponse("Sem permissão.", { status: 403 });

  return servirArquivo(req, { caminho: arquivo.caminho, nome: arquivo.nome, usuarioId: session.user.id });
}

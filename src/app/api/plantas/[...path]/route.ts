import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { servirArquivo } from "@/lib/servir-arquivo";

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const { path: segments } = await params;
  const nome = segments.join("/");
  if (nome.includes("..")) return new NextResponse("Não encontrado.", { status: 404 });

  return servirArquivo(req, { caminho: `plantas/${nome}`, nome, usuarioId: session.user.id, inline: true });
}

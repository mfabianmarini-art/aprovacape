import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { servirArquivo } from "@/lib/servir-arquivo";
import { srtParaVtt, tutorialAtual } from "@/lib/tutorial";

// Vídeo tutorial e legenda da página "Como usar a plataforma", para quem está logado. O
// vídeo sai pelo mesmo caminho dos demais arquivos (Range: o player busca só o trecho que
// vai tocar); a legenda é pequena e vai sempre em WebVTT, que é o que o navegador lê.
export async function GET(req: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const { tipo } = await params;
  const atual = await tutorialAtual();

  if (tipo === "video") {
    if (!atual.video) return new NextResponse("Vídeo indisponível.", { status: 404 });
    return servirArquivo(req, { caminho: atual.video.caminho, nome: atual.video.nome, usuarioId: session.user.id, inline: true });
  }

  if (tipo === "legenda") {
    if (!atual.legenda) return new NextResponse("Legenda indisponível.", { status: 404 });
    const r = await get(atual.legenda.caminho, { access: "private" }).catch(() => null);
    if (!r || r.statusCode !== 200) return new NextResponse("Legenda indisponível.", { status: 404 });
    const texto = await new Response(r.stream).text();
    return new NextResponse(/\.srt$/i.test(atual.legenda.caminho) ? srtParaVtt(texto) : texto, {
      headers: { "Content-Type": "text/vtt; charset=utf-8", "Cache-Control": "private, no-cache" },
    });
  }

  return new NextResponse("Não encontrado.", { status: 404 });
}

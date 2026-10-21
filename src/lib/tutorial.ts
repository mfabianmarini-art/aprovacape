import { prisma } from "@/lib/prisma";

// Vídeo tutorial guardado na própria plataforma (Blob privado, categoria TUTORIAL do
// inventário), enviado pela equipe CAPE em "Como usar a plataforma". Vale o arquivo mais
// recente de cada tipo que não foi substituído; trocar ou remover apaga o anterior.
export type TipoTutorial = "video" | "legenda";

export const EXTENSOES_TUTORIAL: Record<TipoTutorial, RegExp> = { video: /\.mp4$/i, legenda: /\.(srt|vtt)$/i };

export async function tutorialAtual() {
  const arquivos = await prisma.arquivo.findMany({
    where: { categoria: "TUTORIAL", substituidoEm: null, excluidoEm: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, caminho: true, nome: true, tamanho: true, createdAt: true },
  });
  const doTipo = (t: TipoTutorial) => arquivos.find((a) => EXTENSOES_TUTORIAL[t].test(a.caminho)) ?? null;
  return { video: doTipo("video"), legenda: doTipo("legenda") };
}

// O navegador só lê legenda em WebVTT; o SRT (formato mais comum, o que o YouTube aceita)
// é convertido na entrega: cabeçalho WEBVTT e vírgula dos milissegundos trocada por ponto.
export function srtParaVtt(srt: string) {
  const corpo = srt
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/(\d\d:\d\d:\d\d),(\d{3})/g, "$1.$2");
  return `WEBVTT\n\n${corpo}`;
}

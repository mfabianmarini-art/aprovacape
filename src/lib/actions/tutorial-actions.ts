"use server";

import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { registrarArquivo } from "@/lib/arquivos";
import { receberArquivo } from "@/lib/upload-direto";
import { EXTENSOES_TUTORIAL, type TipoTutorial } from "@/lib/tutorial";

export type TutorialState = { error?: string; ok?: string } | null;

function tipoValido(tipo: string): tipo is TipoTutorial {
  return tipo === "video" || tipo === "legenda";
}

// Tira de uso os arquivos do tipo (menos o recém-publicado): a linha do inventário fica
// (excluidoEm) e o arquivo sai do Blob — tutorial não é documentação de obra, não há o que
// guardar.
async function aposentar(tipo: TipoTutorial, exceto?: string) {
  const emUso = await prisma.arquivo.findMany({
    where: { categoria: "TUTORIAL", substituidoEm: null, excluidoEm: null, ...(exceto && { caminho: { not: exceto } }) },
    select: { id: true, caminho: true },
  });
  const sair = emUso.filter((a) => EXTENSOES_TUTORIAL[tipo].test(a.caminho));
  if (sair.length === 0) return;
  const agora = new Date();
  await prisma.arquivo.updateMany({ where: { id: { in: sair.map((a) => a.id) } }, data: { substituidoEm: agora, excluidoEm: agora } });
  await del(sair.map((a) => a.caminho)).catch((e) => console.error("[tutorial] não apagou do Blob", e));
}

// O arquivo já subiu direto do navegador ao Blob (vídeo de dezenas de MB não passa pela
// função da Vercel); aqui ele é conferido, registrado e passa a ser o exibido.
export async function publicarTutorialAction(tipo: string, _prev: TutorialState, formData: FormData): Promise<TutorialState> {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  if (!tipoValido(tipo)) return { error: "Tipo inválido." };
  const pathname = String(formData.get("pathname") ?? "");
  const nome = String(formData.get("nomeArquivo") ?? "").slice(0, 255);
  if (!pathname) return { error: tipo === "video" ? "Selecione o vídeo (MP4)." : "Selecione a legenda (SRT ou VTT)." };
  if (!EXTENSOES_TUTORIAL[tipo].test(pathname)) return { error: "Formato não aceito." };

  const recebido = await receberArquivo(pathname, nome, { destino: "tutorial", tipo });
  if ("erro" in recebido) return { error: recebido.erro };

  await registrarArquivo({
    caminho: pathname,
    nome,
    tamanho: recebido.tamanho,
    hash: String(formData.get("hash") ?? ""),
    categoria: "TUTORIAL",
    enviadoPorId: session.user.id,
  });
  await aposentar(tipo, pathname);

  revalidatePath("/ajuda");
  return { ok: tipo === "video" ? "Vídeo publicado." : "Legenda publicada." };
}

export async function removerTutorialAction(tipo: string): Promise<TutorialState> {
  await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  if (!tipoValido(tipo)) return { error: "Tipo inválido." };
  await aposentar(tipo);
  revalidatePath("/ajuda");
  return { ok: tipo === "video" ? "Vídeo removido." : "Legenda removida." };
}

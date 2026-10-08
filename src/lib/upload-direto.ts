import { del, get } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DOC_REGRAS } from "@/lib/status";
import { extensaoDoNome, regraDoDestino, type DestinoUpload } from "@/lib/upload-destino";
import type { DocumentoTipo } from "@/generated/prisma/enums";

function lerDestino(payload: string | null): DestinoUpload {
  const d = JSON.parse(payload ?? "{}") as Partial<DestinoUpload> & { tipo?: string };
  if (typeof d.solicitacaoId !== "string") throw new Error("Destino inválido.");
  if (d.destino === "documento" && d.tipo && d.tipo in DOC_REGRAS) return { destino: "documento", solicitacaoId: d.solicitacaoId, tipo: d.tipo as DocumentoTipo };
  if (d.destino === "devolutiva" || d.destino === "alvara") return { destino: d.destino, solicitacaoId: d.solicitacaoId };
  throw new Error("Destino inválido.");
}

// Quem pode subir o quê: a mesma regra das actions que registram o arquivo depois. O
// token só vale para o caminho pedido, e o caminho precisa estar na pasta do destino.
export async function autorizarUpload(pathname: string, payload: string | null) {
  const session = await auth();
  if (!session) throw new Error("Não autenticado.");
  const d = lerDestino(payload);
  const sol = await prisma.solicitacao.findUnique({ where: { id: d.solicitacaoId }, include: { lote: true } });
  if (!sol) throw new Error("Solicitação não encontrada.");
  const { role, id } = session.user;

  if (d.destino === "devolutiva") {
    if (role !== "ADMIN_CAPE" && role !== "CAPE_ANALISTA") throw new Error("Sem permissão.");
  } else {
    if (role !== "RESPONSAVEL_TECNICO" || sol.lote.rtId !== id) throw new Error("Sem permissão.");
    const aceita = d.destino === "documento" ? ["RASCUNHO", "COMPLEMENTO"] : ["APROVADA", "RESSALVAS"];
    if (!aceita.includes(sol.status)) throw new Error("Esta solicitação não aceita este arquivo agora.");
  }

  const regra = regraDoDestino(d);
  if (!pathname.startsWith(regra.pasta) || pathname.includes("..")) throw new Error("Caminho inválido.");
  if (!regra.extensoes.includes(extensaoDoNome(pathname))) throw new Error("Formato não aceito.");
  return { maximumSizeInBytes: regra.maxBytes, addRandomSuffix: false, allowOverwrite: false };
}

// Confere um arquivo já enviado: está na pasta esperada, existe, e devolve tamanho e os
// primeiros bytes (versão do DWG, cabeçalho do .zip). Nulo se algo não bate.
export async function lerArquivoEnviado(pathname: string, d: DestinoUpload) {
  const regra = regraDoDestino(d);
  if (!pathname.startsWith(regra.pasta) || pathname.includes("..")) return null;
  const r = await get(pathname, { access: "private" }).catch(() => null);
  if (!r || r.statusCode !== 200) return null;
  const reader = r.stream.getReader();
  let inicio = new Uint8Array(0);
  while (inicio.length < 16) {
    const { value, done } = await reader.read();
    if (done || !value) break;
    const junto = new Uint8Array(inicio.length + value.length);
    junto.set(inicio);
    junto.set(value, inicio.length);
    inicio = junto;
  }
  await reader.cancel().catch(() => {});
  return { tamanho: r.blob.size, inicio: inicio.slice(0, 16) };
}

// Arquivo recusado na conferência não fica ocupando o Blob.
export async function descartarArquivo(pathname: string) {
  await del(pathname).catch(() => {});
}

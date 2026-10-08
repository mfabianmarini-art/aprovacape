import { del, get } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DOC_REGRAS } from "@/lib/status";
import { extensaoDoNome, regraDoDestino, type DestinoUpload } from "@/lib/upload-destino";
import { podeGerirDocumentosTecnicos } from "@/lib/acesso-arquivos";
import { conteudoConfere } from "@/lib/upload-documento";
import type { DocumentoTipo } from "@/generated/prisma/enums";

function lerDestino(payload: string | null): DestinoUpload {
  const d = JSON.parse(payload ?? "{}") as Record<string, unknown>;
  const id = (k: string) => {
    const v = d[k];
    if (typeof v !== "string" || !/^[a-z0-9_-]{1,64}$/i.test(v)) throw new Error("Destino inválido.");
    return v;
  };
  switch (d.destino) {
    case "documento":
      if (typeof d.tipo !== "string" || !(d.tipo in DOC_REGRAS)) throw new Error("Destino inválido.");
      return { destino: "documento", solicitacaoId: id("solicitacaoId"), tipo: d.tipo as DocumentoTipo };
    case "devolutiva":
    case "alvara":
    case "evidencia":
      return { destino: d.destino, solicitacaoId: id("solicitacaoId") };
    case "vinculo":
      return { destino: "vinculo", usuarioId: id("usuarioId") };
    case "tecnico":
    case "planta":
      return { destino: d.destino, empreendimentoId: id("empreendimentoId") };
  }
  throw new Error("Destino inválido.");
}

const CAPE = ["ADMIN_CAPE", "CAPE_ANALISTA"];

// Quem pode subir o quê: a mesma regra das actions que registram o arquivo depois. O
// token só vale para o caminho pedido, e o caminho precisa estar na pasta do destino.
export async function autorizarUpload(pathname: string, payload: string | null) {
  const session = await auth();
  if (!session) throw new Error("Não autenticado.");
  const d = lerDestino(payload);
  const { role, id } = session.user;

  switch (d.destino) {
    case "devolutiva":
    case "evidencia":
    case "planta":
      if (!CAPE.includes(role)) throw new Error("Sem permissão.");
      break;
    case "vinculo":
      if (role !== "RESPONSAVEL_TECNICO" || d.usuarioId !== id) throw new Error("Sem permissão.");
      break;
    case "tecnico":
      if (!(await podeGerirDocumentosTecnicos(session.user, d.empreendimentoId))) throw new Error("Sem permissão.");
      break;
    case "documento":
    case "alvara": {
      const sol = await prisma.solicitacao.findUnique({ where: { id: d.solicitacaoId }, include: { lote: true } });
      if (!sol) throw new Error("Solicitação não encontrada.");
      if (role !== "RESPONSAVEL_TECNICO" || sol.lote.rtId !== id) throw new Error("Sem permissão.");
      const aceita = d.destino === "documento" ? ["RASCUNHO", "COMPLEMENTO"] : ["APROVADA", "RESSALVAS"];
      if (!aceita.includes(sol.status)) throw new Error("Esta solicitação não aceita este arquivo agora.");
    }
  }

  const regra = regraDoDestino(d);
  if (!pathname.startsWith(regra.pasta) || pathname.includes("..")) throw new Error("Caminho inválido.");
  if (!regra.extensoes.includes(extensaoDoNome(pathname))) throw new Error("Formato não aceito.");
  return { maximumSizeInBytes: regra.maxBytes, addRandomSuffix: false, allowOverwrite: false };
}

// Confere um arquivo já enviado: está na pasta esperada, existe, e devolve tamanho e os
// primeiros bytes (para conferir o formato pelo conteúdo). Nulo se algo não bate.
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

// Conferência completa de um arquivo recebido por upload direto: pasta do destino,
// extensão, tamanho e conteúdo (assinatura do formato). Recusado, é apagado do Blob.
export async function receberArquivo(pathname: string, nome: string, d: DestinoUpload): Promise<{ tamanho: number } | { erro: string }> {
  const regra = regraDoDestino(d);
  const arq = pathname && nome ? await lerArquivoEnviado(pathname, d) : null;
  if (!arq) return { erro: "Arquivo não encontrado. Envie de novo." };
  const ext = extensaoDoNome(nome);
  let erro: string | null = null;
  if (!regra.extensoes.includes(ext) || extensaoDoNome(pathname) !== ext) erro = `Formato não aceito: "${nome}".`;
  else if (arq.tamanho > regra.maxBytes) erro = `"${nome}" passa de ${regra.maxBytes / 1024 / 1024} MB.`;
  else if (!conteudoConfere(nome, arq.inicio)) erro = `O conteúdo de "${nome}" não é um ${ext.slice(1).toUpperCase()} válido.`;
  if (erro) {
    await descartarArquivo(pathname);
    return { erro };
  }
  return { tamanho: arq.tamanho };
}

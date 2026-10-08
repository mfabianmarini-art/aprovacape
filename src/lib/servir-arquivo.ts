import { after } from "next/server";
import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { contentDisposition } from "@/lib/content-disposition";
import { contentTypeDe } from "@/lib/upload-documento";

// Entrega de qualquer arquivo do Blob, depois de a rota conferir a permissão.
// - Tipo pela extensão do nome validado no upload, nunca o declarado por quem enviou.
// - Cache privado no navegador: o caminho de cada arquivo é único e nunca muda, então
//   reabrir não baixa de novo; passado o prazo, o ETag faz o Blob responder 304, sem
//   transferir o arquivo.
// - Range: o leitor de PDF pede trechos e mostra a primeira página sem esperar o resto.
// - Cada abertura fica registrada (AcessoArquivo), depois da resposta.
export async function servirArquivo(
  req: Request,
  o: { caminho: string; nome: string; usuarioId: string; inline?: boolean },
): Promise<NextResponse> {
  const registro = await prisma.arquivo.findUnique({ where: { caminho: o.caminho }, select: { id: true, excluidoEm: true } });
  if (registro?.excluidoEm) return new NextResponse("Arquivo excluído após o encerramento do contrato.", { status: 410 });

  const range = req.headers.get("range");
  const ifNoneMatch = req.headers.get("if-none-match") ?? undefined;
  const r = await get(o.caminho, { access: "private", ifNoneMatch, headers: range ? { Range: range } : undefined }).catch(() => null);
  if (!r) return new NextResponse("Arquivo indisponível.", { status: 404 });

  const etag = r.blob.etag || r.headers.get("etag") || "";
  const comuns: Record<string, string> = { "Cache-Control": "private, max-age=86400", "Accept-Ranges": "bytes", ...(etag && { ETag: etag }) };
  if (r.statusCode === 304) return new NextResponse(null, { status: 304, headers: comuns });

  const tipo = contentTypeDe(o.nome);
  const inline = o.inline ?? (tipo === "application/pdf" || tipo.startsWith("image/"));
  const parcial = r.headers.get("content-range");
  const tamanho = r.headers.get("content-length");

  // Um registro por abertura: o leitor de PDF faz várias requisições em trechos, e só a
  // primeira (sem Range, ou a partir do byte 0) conta.
  if (registro && (!range || /^bytes=0-/.test(range))) {
    after(() => prisma.acessoArquivo.create({ data: { arquivoId: registro.id, usuarioId: o.usuarioId } }).catch(() => {}));
  }

  return new NextResponse(r.stream, {
    status: parcial ? 206 : 200,
    headers: {
      ...comuns,
      "Content-Type": tipo,
      "Content-Disposition": contentDisposition(inline ? "inline" : "attachment", o.nome),
      ...(tamanho && { "Content-Length": tamanho }),
      ...(parcial && { "Content-Range": parcial }),
    },
  });
}

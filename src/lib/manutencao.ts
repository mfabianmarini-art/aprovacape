import { del, list } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import type { ArquivoCategoria } from "@/generated/prisma/enums";

// Data em que o inventário (model Arquivo) entrou no ar. Blob anterior a isto e fora do
// inventário é documento de antes do inventário (ex.: versão substituída quando ainda não
// se guardava histórico) — é ADOTADO, nunca apagado. Depois disto, todo arquivo
// registrado entra no inventário na mesma transação, então o que sobra fora dele é upload
// abandonado (a pessoa fechou a tela no meio do envio).
export const INVENTARIO_DESDE = new Date("2026-10-10T00:00:00Z");
const ABANDONADO_APOS_MS = 7 * 24 * 60 * 60 * 1000;

type Blob = { pathname: string; size: number; uploadedAt: Date };

// De onde o arquivo veio, pelo caminho — só para adoção de arquivos antigos.
function origemPeloCaminho(caminho: string): { categoria: ArquivoCategoria; solicitacaoId?: string; empreendimentoId?: string } {
  const p = caminho.split("/");
  if (p[0] === "plantas") return { categoria: "PLANTA", empreendimentoId: p.length > 2 ? p[1] : p[1]?.split("-")[0] };
  if (p[0] !== "documentos") return { categoria: "RECUPERADO" };
  if (p[1] === "tecnicos") return { categoria: "DOCUMENTO_TECNICO", empreendimentoId: p[2] };
  if (p[1] === "vinculos") return { categoria: "VINCULO" };
  if (p[1] === "devolutivas") return { categoria: "DEVOLUTIVA", solicitacaoId: p[2] };
  if (p[1] === "alvaras") return { categoria: "ALVARA", solicitacaoId: p[2] };
  if (p[1] === "irregularidades") return { categoria: "EVIDENCIA", solicitacaoId: p[2] };
  return { categoria: "RECUPERADO", solicitacaoId: p[1] };
}

// Ainda referenciado por alguma tabela de origem? (Proteção extra antes de apagar.)
async function referenciado(caminho: string) {
  const [doc, dev, alv, evi, tec, vin, pla] = await Promise.all([
    prisma.solicitacaoDocumento.count({ where: { caminhoArquivo: caminho } }),
    prisma.devolutivaTecnica.count({ where: { arquivoCaminho: caminho } }),
    prisma.solicitacao.count({ where: { alvaraCaminho: caminho } }),
    prisma.irregularidadeEvidencia.count({ where: { caminhoArquivo: caminho } }),
    prisma.documentoTecnico.count({ where: { caminhoArquivo: caminho } }),
    prisma.user.count({ where: { vinculoArquivoCaminho: caminho } }),
    prisma.empreendimento.count({ where: { plantaImageUrl: `/api/${caminho}` } }),
  ]);
  return doc + dev + alv + evi + tec + vin + pla > 0;
}

async function adotar(b: Blob) {
  const origem = origemPeloCaminho(b.pathname);
  let solicitacaoId: string | undefined;
  let empreendimentoId = origem.empreendimentoId;
  if (origem.solicitacaoId) {
    const sol = await prisma.solicitacao.findUnique({ where: { id: origem.solicitacaoId }, select: { id: true, lote: { select: { empreendimentoId: true } } } });
    if (sol) {
      solicitacaoId = sol.id;
      empreendimentoId = sol.lote.empreendimentoId;
    }
  }
  if (empreendimentoId && !(await prisma.empreendimento.count({ where: { id: empreendimentoId } }))) empreendimentoId = undefined;
  const emUso = await referenciado(b.pathname);
  await prisma.arquivo.upsert({
    where: { caminho: b.pathname },
    update: {},
    create: {
      caminho: b.pathname,
      nome: b.pathname.split("/").at(-1) ?? b.pathname,
      tamanho: b.size,
      categoria: origem.categoria,
      solicitacaoId,
      empreendimentoId,
      createdAt: b.uploadedAt,
      // Fora de uso: foi substituído antes de existir o histórico de versões.
      substituidoEm: emUso ? null : b.uploadedAt,
    },
  });
}

export async function executarManutencao(agora = new Date()) {
  const r = { blobs: 0, adotados: 0, abandonadosApagados: 0, protegidos: 0, limitesApagados: 0, redefinicoesApagadas: 0 };
  let cursor: string | undefined;
  do {
    const pagina = await list({ cursor, limit: 1000 });
    cursor = pagina.hasMore ? pagina.cursor : undefined;
    r.blobs += pagina.blobs.length;
    const conhecidos = new Set(
      (await prisma.arquivo.findMany({ where: { caminho: { in: pagina.blobs.map((b) => b.pathname) } }, select: { caminho: true } })).map((a) => a.caminho),
    );
    const apagar: string[] = [];
    for (const b of pagina.blobs) {
      if (conhecidos.has(b.pathname)) continue;
      const uploadedAt = new Date(b.uploadedAt);
      if (uploadedAt < INVENTARIO_DESDE) {
        await adotar({ pathname: b.pathname, size: b.size, uploadedAt });
        r.adotados++;
      } else if (agora.getTime() - uploadedAt.getTime() > ABANDONADO_APOS_MS) {
        // Upload que nunca foi registrado. Se por acaso alguma tabela o referencia, não é
        // abandonado: entra no inventário em vez de sumir.
        if (await referenciado(b.pathname)) {
          await adotar({ pathname: b.pathname, size: b.size, uploadedAt });
          r.protegidos++;
        } else {
          apagar.push(b.pathname);
        }
      }
    }
    if (apagar.length) {
      await del(apagar);
      r.abandonadosApagados += apagar.length;
      console.log(JSON.stringify({ evento: "manutencao_apagou_abandonados", caminhos: apagar }));
    }
  } while (cursor);

  const umDia = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
  r.limitesApagados = (await prisma.limiteTaxa.deleteMany({ where: { inicio: { lt: umDia } } })).count;
  r.redefinicoesApagadas = (await prisma.redefinicaoSenha.deleteMany({ where: { expiraEm: { lt: umDia } } })).count;
  return r;
}

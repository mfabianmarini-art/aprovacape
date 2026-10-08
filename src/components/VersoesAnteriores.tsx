import { DOC_LABEL, formatDateTime } from "@/lib/status";
import { formatarTamanho } from "@/lib/arquivos-formato";
import type { ArquivoCategoria, DocumentoTipo } from "@/generated/prisma/enums";

export type VersaoAnterior = {
  id: string;
  nome: string;
  tamanho: number;
  categoria: ArquivoCategoria;
  documentoTipo: DocumentoTipo | null;
  createdAt: Date | string;
  substituidoEm: Date | string | null;
};

// Inclui no select do Prisma: só as versões que deixaram de ser a vigente.
export const SELECT_VERSOES_ANTERIORES = {
  where: { substituidoEm: { not: null } },
  orderBy: { createdAt: "desc" },
  select: { id: true, nome: true, tamanho: true, categoria: true, documentoTipo: true, createdAt: true, substituidoEm: true },
} as const;

const CATEGORIA: Partial<Record<ArquivoCategoria, string>> = {
  ALVARA: "Alvará de execução",
  DEVOLUTIVA: "Apontamentos da CAPE",
  EVIDENCIA: "Evidência",
  RECUPERADO: "Arquivo anterior",
};

// Por contrato, toda a documentação fica disponível ao condomínio: substituir um documento
// não apaga o anterior. Esta lista dá acesso a eles, recolhida para não pesar na tela.
export function VersoesAnteriores({ versoes }: { versoes: VersaoAnterior[] }) {
  if (versoes.length === 0) return null;
  return (
    <details style={{ border: "1px solid #EDE9E1", borderRadius: 4, background: "#FAF9F6", padding: "9px 12px" }}>
      <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#4A5563" }}>
        Versões anteriores ({versoes.length})
      </summary>
      <div style={{ fontSize: 11.5, color: "#7A7472", margin: "6px 0 8px", lineHeight: 1.45 }}>
        Arquivos substituídos ao longo da análise. Ficam guardados e disponíveis.
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {versoes.map((v) => (
          <li key={v.id} style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", alignItems: "baseline", fontSize: 12 }}>
            <span style={{ color: "#3B4653", minWidth: 0 }}>
              {v.documentoTipo ? DOC_LABEL[v.documentoTipo].nome : (CATEGORIA[v.categoria] ?? "Arquivo")}
            </span>
            <a href={`/api/arquivos/${v.id}`} target="_blank" rel="noreferrer" style={{ fontWeight: 600, overflowWrap: "anywhere" }}>
              {v.nome}
            </a>
            <span style={{ color: "#7A7472", fontSize: 11 }}>
              {formatarTamanho(v.tamanho)} · enviado {formatDateTime(new Date(v.createdAt))}
              {v.substituidoEm ? ` · substituído ${formatDateTime(new Date(v.substituidoEm))}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

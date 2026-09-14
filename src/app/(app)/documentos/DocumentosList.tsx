import { deleteDocumentoTecnicoAction } from "@/lib/actions/documento-tecnico-actions";
import { CATEGORIA_DOC_TECNICO_LABEL, formatDate } from "@/lib/status";
import type { getDocumentosTecnicos } from "@/lib/queries/documentos-tecnicos";

type Documentos = Awaited<ReturnType<typeof getDocumentosTecnicos>>;

function formatKB(bytes: number) {
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("pt-BR")} KB`;
}

export function DocumentosList({ documentos, podeGerenciar }: { documentos: Documentos; podeGerenciar: boolean }) {
  return (
    <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, overflow: "hidden" }}>
      <div
        style={{
          padding: "15px 18px",
          borderBottom: "1px solid #EDE9E1",
          fontFamily: "var(--font-display)",
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: ".04em",
          textTransform: "uppercase",
        }}
      >
        Manual, convenção e regras
      </div>
      {documentos.length === 0 && (
        <div style={{ padding: 24, fontSize: 13, color: "#7A7472" }}>Nenhum documento enviado ainda.</div>
      )}
      {documentos.map((d) => (
        <div
          key={d.id}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "13px 18px", borderBottom: "1px solid #F1EEE7" }}
        >
          <a href={`/api/documentos-tecnicos/${d.id}`} target="_blank" rel="noreferrer" style={{ display: "flex", flexDirection: "column", gap: 3, textDecoration: "none", color: "inherit", flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "3px 8px",
                  borderRadius: 3,
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: ".04em",
                  textTransform: "uppercase",
                  background: "#CFD8DE",
                  color: "#E01B22",
                }}
              >
                {CATEGORIA_DOC_TECNICO_LABEL[d.categoria]}
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#E01B22" }}>{d.titulo}</span>
            </div>
            {d.descricao && (
              <div style={{ fontSize: 12.5, color: "#3B4653", lineHeight: 1.45, whiteSpace: "pre-line" }}>{d.descricao}</div>
            )}
            <div style={{ fontSize: 11.5, color: "#7A7472" }}>
              {d.nomeArquivo} · {formatKB(d.tamanhoBytes)} · enviado por {d.enviadoPor.name} em {formatDate(d.createdAt)}
            </div>
          </a>
          {podeGerenciar && (
            <form action={deleteDocumentoTecnicoAction.bind(null, d.id)}>
              <button
                type="submit"
                title="Remover documento"
                style={{ border: "1px solid #EDE9E1", background: "#fff", color: "#8C2B22", borderRadius: 4, padding: "6px 10px", fontSize: 13, cursor: "pointer" }}
              >
                ×
              </button>
            </form>
          )}
        </div>
      ))}
    </section>
  );
}

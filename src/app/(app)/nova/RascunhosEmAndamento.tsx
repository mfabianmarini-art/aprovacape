import { DOC_ORDER, TIPO_LABEL, formatDate } from "@/lib/status";
import { cancelarRascunhoAction } from "@/lib/actions/nova-actions";
import type { getMeusRascunhos } from "@/lib/queries/nova";

type Rascunhos = Awaited<ReturnType<typeof getMeusRascunhos>>;

export function RascunhosEmAndamento({ rascunhos }: { rascunhos: Rascunhos }) {
  if (rascunhos.length === 0) return null;

  return (
    <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderTop: "3px solid #B4711A", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #EDE9E1", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
          Solicitações em andamento
        </div>
        <div style={{ fontSize: 11.5, color: "#6B7480" }}>
          Ainda não enviadas à CAPE — retome de onde parou ou descarte.
        </div>
      </div>

      {rascunhos.map((r) => {
        const anexados = DOC_ORDER.filter((t) => r.documentos.some((d) => d.tipo === t)).length;
        const completo = anexados === DOC_ORDER.length;
        return (
          <div
            key={r.id}
            style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "center", gap: 14, padding: "13px 18px", borderBottom: "1px solid #F1EEE7" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                {r.lote.quadra.nome} L{r.lote.numero} · {TIPO_LABEL[r.tipo]}
              </div>
              <div style={{ fontSize: 11.5, color: "#6B7480" }}>
                {r.lote.empreendimento.nome} · iniciada em {formatDate(r.createdAt)} ·{" "}
                <span style={{ fontFamily: "var(--font-mono)", color: completo ? "#24603A" : "#8A5210" }}>
                  {anexados}/{DOC_ORDER.length} documentos
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a
                href={`/nova?rascunho=${r.id}&passo=${completo ? 3 : 2}`}
                style={{ border: "1px solid #12455E", background: "#12455E", color: "#fff", borderRadius: 4, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}
              >
                Retomar
              </a>
              <form action={cancelarRascunhoAction.bind(null, r.id)}>
                <button
                  type="submit"
                  title="Descartar este rascunho"
                  style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#8C2B22", borderRadius: 4, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                >
                  Descartar
                </button>
              </form>
            </div>
          </div>
        );
      })}
    </section>
  );
}

import type { Etapa, EstadoEtapa } from "@/lib/etapas";

const COR: Record<EstadoEtapa, { bola: string; borda: string; icone: string; titulo: string; detalhe: string }> = {
  concluida: { bola: "#24603A", borda: "#24603A", icone: "#FFFFFF", titulo: "#24603A", detalhe: "#4A6B53" },
  andamento: { bola: "#F2C230", borda: "#C99A06", icone: "#5C4500", titulo: "#7A5C00", detalhe: "#7A5C00" },
  pendente: { bola: "#FFFFFF", borda: "#C9C2B4", icone: "#A8A196", titulo: "#8B939C", detalhe: "#A8A196" },
  reprovada: { bola: "#8C2B22", borda: "#8C2B22", icone: "#FFFFFF", titulo: "#8C2B22", detalhe: "#8C2B22" },
};

const LEGENDA: [EstadoEtapa, string][] = [
  ["concluida", "concluída"],
  ["andamento", "em andamento"],
  ["pendente", "não iniciada"],
];

export function EtapasStepper({ etapas, legenda = true }: { etapas: Etapa[]; legenda?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Rola de lado em tela estreita em vez de espremer seis etapas ilegíveis. */}
      <div className="table-scroll">
        <ol
          aria-label="Etapas da aprovação"
          style={{ listStyle: "none", margin: 0, padding: "2px 0", display: "grid", gridTemplateColumns: `repeat(${etapas.length}, minmax(92px, 1fr))`, minWidth: etapas.length * 96 }}
        >
          {etapas.map((e, i) => {
            const c = COR[e.estado];
            // A linha que sai de uma etapa só fica verde quando ela já foi concluída.
            const linhaAntes = i > 0 ? (etapas[i - 1].estado === "concluida" ? "#24603A" : "#DDD8CE") : "transparent";
            const linhaDepois = i < etapas.length - 1 ? (e.estado === "concluida" ? "#24603A" : "#DDD8CE") : "transparent";
            return (
              <li key={e.titulo} aria-current={e.estado === "andamento" ? "step" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  <span style={{ flex: 1, height: 3, background: linhaAntes }} />
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      flex: "none",
                      display: "grid",
                      placeItems: "center",
                      background: c.bola,
                      border: `2px solid ${c.borda}`,
                      color: c.icone,
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      boxShadow: e.estado === "andamento" ? "0 0 0 4px rgba(242,194,48,.28)" : undefined,
                    }}
                  >
                    {e.estado === "concluida" ? "✓" : e.estado === "reprovada" ? "✕" : e.estado === "andamento" ? "●" : i + 1}
                  </span>
                  <span style={{ flex: 1, height: 3, background: linhaDepois }} />
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.2, color: c.titulo, padding: "0 4px" }}>{e.titulo}</span>
                <span style={{ fontSize: 10.5, lineHeight: 1.3, color: c.detalhe, padding: "0 4px" }}>{e.detalhe}</span>
              </li>
            );
          })}
        </ol>
      </div>
      {legenda && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 10.5, color: "#7A7472" }}>
          {LEGENDA.map(([estado, rotulo]) => (
            <span key={estado} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: COR[estado].bola, border: `1.5px solid ${COR[estado].borda}` }} />
              {rotulo}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

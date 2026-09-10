"use client";

import { useActionState } from "react";
import { updateEmpreendimentoAction } from "@/lib/actions/empreendimento-actions";

const inputStyle: React.CSSProperties = { border: "1px solid #DDD8CE", borderRadius: 4, padding: "10px 11px", fontSize: 13.5, fontFamily: "var(--font-mono)" };
const labelTextStyle: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#6B7480" };

function centsToBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function EmpreendimentoForm({
  id,
  taxaAnaliseCent,
  prazoDias,
  reenviosSemTaxa,
  taxaVisitaCent,
}: {
  id: string;
  taxaAnaliseCent: number;
  prazoDias: number;
  reenviosSemTaxa: number;
  taxaVisitaCent: number;
}) {
  const [state, formAction, pending] = useActionState(updateEmpreendimentoAction, null as { error?: string; ok?: boolean } | null);

  return (
    <form action={formAction} style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
      <input type="hidden" name="empreendimentoId" value={id} />
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Taxa de análise (R$)</span>
        <input name="taxaAnalise" defaultValue={centsToBRL(taxaAnaliseCent)} style={{ ...inputStyle, border: "1px solid #B4711A" }} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Prazo de análise (dias corridos)</span>
        <input name="prazoDias" defaultValue={prazoDias} type="number" min={1} style={inputStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Reenvios sem nova taxa</span>
        <input name="reenviosSemTaxa" defaultValue={reenviosSemTaxa} type="number" min={0} style={inputStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Taxa de visita presencial (R$)</span>
        <input name="taxaVisita" defaultValue={centsToBRL(taxaVisitaCent)} style={inputStyle} />
      </label>
      <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="submit"
          disabled={pending}
          style={{ border: "1px solid #12455E", background: "#12455E", color: "#fff", borderRadius: 4, padding: "9px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
        >
          {pending ? "Salvando…" : "Salvar alterações"}
        </button>
        {state?.ok && <span style={{ fontSize: 12, color: "#24603A" }}>Salvo.</span>}
        {state?.error && <span style={{ fontSize: 12, color: "#8C2B22" }}>{state.error}</span>}
      </div>
    </form>
  );
}

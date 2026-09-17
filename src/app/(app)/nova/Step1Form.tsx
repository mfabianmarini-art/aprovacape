"use client";

import { useActionState, useState } from "react";
import { criarRascunhoAction } from "@/lib/actions/nova-actions";
import { TIPO_LABEL } from "@/lib/status";

type Lote = {
  id: string;
  numero: string;
  quadra: { nome: string };
  empreendimento: { nome: string };
};

const inputStyle: React.CSSProperties = { border: "1px solid #DDD8CE", borderRadius: 4, padding: "10px 11px", fontSize: 13.5 };
const labelTextStyle: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" };

export function Step1Form({ lotes }: { lotes: Lote[] }) {
  const [state, formAction, pending] = useActionState(criarRascunhoAction, null as { error?: string } | null);
  const [loteId, setLoteId] = useState(lotes[0]?.id ?? "");

  if (lotes.length === 0) {
    return (
      <div style={{ padding: 20, fontSize: 13, color: "#7A7472" }}>
        Nenhum lote vinculado à sua conta ainda. A CAPE precisa confirmar seu vínculo antes de abrir uma solicitação.
      </div>
    );
  }

  return (
    <form action={formAction} style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Lote</span>
        <select name="loteId" required value={loteId} onChange={(e) => setLoteId(e.target.value)} style={{ ...inputStyle, background: "#fff" }}>
          {lotes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.empreendimento.nome} · {l.quadra.nome} L{l.numero}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Tipo de solicitação</span>
        <select name="tipo" required style={{ ...inputStyle, background: "#fff" }}>
          {Object.entries(TIPO_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Área de intervenção (m²)</span>
        <input name="areaIntervencao" required type="number" step="0.01" min="0" style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1/-1" }}>
        <span style={labelTextStyle}>Descrição da obra</span>
        <textarea name="descricao" required rows={4} style={{ ...inputStyle, resize: "vertical" }} />
      </label>

      {state?.error && <div style={{ gridColumn: "1/-1", fontSize: 12.5, color: "#8C2B22" }}>{state.error}</div>}

      <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, borderTop: "1px solid #EDE9E1", paddingTop: 16 }}>
        <button
          type="submit"
          disabled={pending}
          style={{ border: "1px solid #E01B22", background: "#E01B22", color: "#fff", borderRadius: 4, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {pending ? "Salvando…" : "Continuar"}
        </button>
      </div>
    </form>
  );
}

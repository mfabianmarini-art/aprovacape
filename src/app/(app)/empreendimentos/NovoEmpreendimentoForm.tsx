"use client";

import { useActionState, useState } from "react";
import { createEmpreendimentoAction, type CreateEmpreendimentoState } from "@/lib/actions/empreendimento-actions";

const inputStyle: React.CSSProperties = { border: "1px solid #DDD8CE", borderRadius: 4, padding: "10px 11px", fontSize: 13.5, background: "#fff" };
const labelTextStyle: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#6B7480" };

export function NovoEmpreendimentoForm() {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<CreateEmpreendimentoState, FormData>(createEmpreendimentoAction, null);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        style={{ border: "1px solid #12455E", background: "#12455E", color: "#fff", borderRadius: 4, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
      >
        Novo empreendimento
      </button>
    );
  }

  return (
    <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderTop: "3px solid #B4711A", borderRadius: 4, padding: 18, display: "flex", flexDirection: "column", gap: 13 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>Novo empreendimento</div>
        <button type="button" onClick={() => setAberto(false)} style={{ border: 0, background: "transparent", color: "#6B7480", fontSize: 12.5, cursor: "pointer" }}>
          cancelar
        </button>
      </div>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelTextStyle}>Nome do empreendimento</span>
          <input name="nome" required style={inputStyle} />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 70px", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={labelTextStyle}>Cidade</span>
            <input name="cidade" required style={inputStyle} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={labelTextStyle}>UF</span>
            <input name="uf" required maxLength={2} placeholder="SP" style={{ ...inputStyle, textTransform: "uppercase", fontFamily: "var(--font-mono)" }} />
          </label>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelTextStyle}>Nº de quadras</span>
          <input name="numQuadras" required type="number" min={1} defaultValue={1} style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelTextStyle}>Taxa de análise (R$)</span>
          <input name="taxaAnalise" required placeholder="0,00" style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelTextStyle}>Prazo de análise (dias corridos)</span>
          <input name="prazoDias" required type="number" min={1} defaultValue={10} style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
        </label>
        {state?.error && <div style={{ fontSize: 12, color: "#8C2B22" }}>{state.error}</div>}
        <button
          type="submit"
          disabled={pending}
          style={{ border: "1px solid #12455E", background: "#12455E", color: "#fff", borderRadius: 4, padding: "11px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {pending ? "Criando…" : "Criar empreendimento"}
        </button>
        <div style={{ fontSize: 11.5, color: "#6B7480", lineHeight: 1.45 }}>
          Quadras, lotes, planta e check-list são configurados depois, nas telas Empreendimentos e Check-lists.
        </div>
      </form>
    </section>
  );
}

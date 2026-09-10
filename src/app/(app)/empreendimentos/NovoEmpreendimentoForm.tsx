"use client";

import { useActionState, useRef, useState } from "react";
import { createEmpreendimentoAction, type CreateEmpreendimentoState } from "@/lib/actions/empreendimento-actions";

const inputStyle: React.CSSProperties = { border: "1px solid #DDD8CE", borderRadius: 4, padding: "10px 11px", fontSize: 13.5, background: "#fff" };
const labelTextStyle: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#6B7480" };
const dashedInputStyle: React.CSSProperties = { border: "1px dashed #C9C2B4", borderRadius: 4, padding: "8px 10px", fontSize: 13 };

export function NovoEmpreendimentoForm() {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<CreateEmpreendimentoState, FormData>(createEmpreendimentoAction, null);
  const proximoId = useRef(2);
  const [quadras, setQuadras] = useState<number[]>([0, 1]);

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
          <span style={labelTextStyle}>Taxa de análise (R$)</span>
          <input name="taxaAnalise" required placeholder="0,00" style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelTextStyle}>Prazo de análise (dias corridos)</span>
          <input name="prazoDias" required type="number" min={1} defaultValue={10} style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, border: "1px solid #EDE9E1", borderRadius: 4, padding: 14, background: "#FAF9F6" }}>
          <span style={labelTextStyle}>Quadras</span>
          <div style={{ fontSize: 11.5, color: "#6B7480", lineHeight: 1.4 }}>
            Nomeie cada quadra como preferir (A, B, A1, F2…) e informe a quantidade de lotes de cada uma — não precisam seguir uma sequência nem ter a mesma quantidade.
          </div>
          {quadras.map((id, i) => (
            <div key={id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 30px", gap: 8 }}>
              <input name="quadraNome" placeholder="Nome da quadra" required={i === 0} style={dashedInputStyle} />
              <input name="quadraLotes" type="number" min={1} placeholder="Lotes" required={i === 0} style={{ ...dashedInputStyle, fontFamily: "var(--font-mono)" }} />
              <button
                type="button"
                onClick={() => setQuadras((qs) => qs.filter((q) => q !== id))}
                disabled={quadras.length === 1}
                title="Remover quadra"
                style={{ border: "1px solid #EDE9E1", background: "#fff", color: quadras.length === 1 ? "#C9C2B4" : "#8C2B22", borderRadius: 4, fontSize: 13, cursor: quadras.length === 1 ? "not-allowed" : "pointer" }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setQuadras((qs) => [...qs, proximoId.current++])}
            style={{ alignSelf: "flex-start", border: "1px dashed #C9C2B4", background: "#fff", color: "#12455E", borderRadius: 4, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            + adicionar quadra
          </button>
        </div>

        {state?.error && <div style={{ fontSize: 12, color: "#8C2B22" }}>{state.error}</div>}
        <button
          type="submit"
          disabled={pending}
          style={{ border: "1px solid #12455E", background: "#12455E", color: "#fff", borderRadius: 4, padding: "11px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {pending ? "Criando…" : "Criar empreendimento"}
        </button>
        <div style={{ fontSize: 11.5, color: "#6B7480", lineHeight: 1.45 }}>
          Planta e check-list são configurados depois, nas telas Empreendimentos e Check-lists.
        </div>
      </form>
    </section>
  );
}

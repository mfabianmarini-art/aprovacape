"use client";

import { useActionState, useState } from "react";
import {
  criarSindicoAction,
  vincularSindicoAction,
  desvincularSindicoAction,
  type NovoInternoState,
} from "@/lib/actions/usuarios-actions";

const inputStyle: React.CSSProperties = { border: "1px solid #DDD8CE", borderRadius: 4, padding: "10px 11px", fontSize: 13.5, background: "#fff" };
const labelTextStyle: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" };
const cardStyle: React.CSSProperties = { background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: 18, display: "flex", flexDirection: "column", gap: 13 };

type Sindico = { id: string; name: string; email: string };

export function SindicoManager({
  empreendimentoId,
  atual,
  disponiveis,
}: {
  empreendimentoId: string;
  atual: { id: string; name: string; email: string } | null;
  disponiveis: Sindico[];
}) {
  const [state, formAction, pending] = useActionState<NovoInternoState, FormData>(
    criarSindicoAction.bind(null, empreendimentoId),
    null,
  );
  const [criando, setCriando] = useState(false);

  const outros = disponiveis.filter((s) => s.id !== atual?.id);

  if (state?.ok) {
    return (
      <section style={cardStyle}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>Síndico criado</div>
        <div style={{ fontSize: 12.5, color: "#4A5563", lineHeight: 1.5 }}>
          Já vinculado a este empreendimento. Sem envio de e-mail configurado — compartilhe a senha temporária por um canal seguro.
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, background: "#FAF9F6", border: "1px solid #EDE9E1", borderRadius: 4, padding: "10px 12px" }}>
          {state.senhaTemp}
        </div>
      </section>
    );
  }

  return (
    <section style={cardStyle}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>Síndico</div>

      {atual ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 7, border: "1px solid #EDE9E1", borderRadius: 4, padding: "12px 13px" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{atual.name}</div>
          <div style={{ fontSize: 11.5, color: "#7A7472" }}>{atual.email} · acesso somente leitura</div>
          <form action={desvincularSindicoAction.bind(null, empreendimentoId)}>
            <button
              type="submit"
              style={{ border: "1px solid #EDE9E1", background: "#fff", color: "#8C2B22", borderRadius: 4, padding: "7px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Desvincular
            </button>
          </form>
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: "#7A7472" }}>Nenhum síndico vinculado — enquanto isso, ninguém enxerga este empreendimento como síndico.</div>
      )}

      {outros.length > 0 && (
        <form action={vincularSindicoAction.bind(null, empreendimentoId)} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <span style={labelTextStyle}>{atual ? "Trocar por um síndico já cadastrado" : "Vincular síndico já cadastrado"}</span>
          <select name="sindicoId" defaultValue="" required style={inputStyle}>
            <option value="" disabled>
              Selecione…
            </option>
            {outros.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.email}
              </option>
            ))}
          </select>
          <button
            type="submit"
            style={{ border: "1px dashed #C9C2B4", background: "#fff", color: "#E01B22", borderRadius: 4, padding: "9px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
          >
            Vincular
          </button>
        </form>
      )}

      {criando ? (
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 11, borderTop: "1px solid #EDE9E1", paddingTop: 13 }}>
          <span style={labelTextStyle}>Novo síndico</span>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={labelTextStyle}>Nome completo</span>
            <input name="nome" required style={inputStyle} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={labelTextStyle}>E-mail</span>
            <input name="email" type="email" required style={inputStyle} />
          </label>
          {state?.error && <div style={{ fontSize: 12, color: "#8C2B22" }}>{state.error}</div>}
          <div style={{ display: "flex", gap: 7 }}>
            <button
              type="submit"
              disabled={pending}
              style={{ flex: 1, border: "1px solid #E01B22", background: "#E01B22", color: "#fff", borderRadius: 4, padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              {pending ? "Criando…" : atual ? "Criar e substituir" : "Criar síndico"}
            </button>
            <button
              type="button"
              onClick={() => setCriando(false)}
              style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#4A5563", borderRadius: 4, padding: "10px 12px", fontSize: 12.5, cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCriando(true)}
          style={{ border: "1px dashed #C9C2B4", background: "#fff", color: "#E01B22", borderRadius: 4, padding: "9px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
        >
          + cadastrar novo síndico
        </button>
      )}
    </section>
  );
}

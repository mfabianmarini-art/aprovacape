"use client";

import { useActionState } from "react";
import { entrarAcompanhamentoAction, type AcompanharState } from "@/lib/actions/acompanhamento-actions";

const inputStyle: React.CSSProperties = { border: "1px solid #DDD8CE", borderRadius: 4, padding: "11px 12px", fontSize: 14, fontFamily: "var(--font-mono)", textTransform: "uppercase" };
const labelTextStyle: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" };

export function AcompanharForm({ protocoloInicial }: { protocoloInicial: string }) {
  const [state, formAction, pending] = useActionState<AcompanharState, FormData>(entrarAcompanhamentoAction, null);

  return (
    <form
      action={formAction}
      style={{ background: "#fff", border: "1px solid #DDD8CE", borderTop: "3px solid #E01B22", borderRadius: 4, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, lineHeight: 1.1 }}>Acompanhar solicitação de obra</div>
        <div style={{ fontSize: 12.5, color: "#4A5563", lineHeight: 1.55 }}>
          Para o proprietário do lote. Informe o protocolo e a senha de acompanhamento que o responsável técnico recebeu ao
          protocolar o pedido. Não é preciso ter conta.
        </div>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Protocolo</span>
        <input name="protocolo" required defaultValue={protocoloInicial} placeholder="SOL-2026-000" autoComplete="off" style={inputStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Senha de acompanhamento</span>
        <input name="senha" required placeholder="XXXX-XXXX" autoComplete="off" autoFocus={!!protocoloInicial} style={inputStyle} />
      </label>
      {state?.error && <div style={{ fontSize: 12.5, color: "#8C2B22" }}>{state.error}</div>}
      <button
        type="submit"
        disabled={pending}
        style={{ border: "1px solid #E01B22", background: "#E01B22", color: "#fff", borderRadius: 4, padding: "12px 16px", fontSize: 13, fontWeight: 600, cursor: pending ? "wait" : "pointer" }}
      >
        {pending ? "Conferindo…" : "Acompanhar"}
      </button>
    </form>
  );
}

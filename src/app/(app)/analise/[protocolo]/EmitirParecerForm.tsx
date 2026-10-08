"use client";

import { useActionState } from "react";
import { emitirParecerAction, type ParecerState } from "@/lib/actions/analise-actions";

const labelTextStyle: React.CSSProperties = { fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#7A7472" };

export function EmitirParecerForm({
  solicitacaoId,
  podeEmitir,
  mostrarDevolutiva,
  rotulo,
  bg,
  fg,
}: {
  solicitacaoId: string;
  podeEmitir: boolean;
  mostrarDevolutiva: boolean;
  rotulo: string;
  bg: string;
  fg: string;
}) {
  const [state, formAction, pending] = useActionState<ParecerState, FormData>(emitirParecerAction.bind(null, solicitacaoId), null);

  return (
    <form action={podeEmitir ? formAction : undefined} style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
      {mostrarDevolutiva && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, background: "#FAF9F6", border: "1px solid #EDE9E1", borderRadius: 4, padding: "13px 14px" }}>
          <div style={{ gridColumn: "1/-1", fontSize: 12, color: "#4A5563", lineHeight: 1.45 }}>
            Opcional — enviado ao responsável técnico junto com o parecer.
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={labelTextStyle}>Comentários gerais ao RT (opcional)</span>
            <textarea
              name="comentario"
              rows={3}
              maxLength={2000}
              placeholder="Observações gerais sobre o projeto, além das apontadas item a item."
              style={{ border: "1px solid #DDD8CE", borderRadius: 4, padding: "8px 10px", fontSize: 12.5, fontFamily: "inherit", lineHeight: 1.45, resize: "vertical" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={labelTextStyle}>Arquivo com os apontamentos (opcional)</span>
            <input name="arquivo" type="file" accept=".dwg,.zip,.pdf" style={{ border: "1px solid #DDD8CE", borderRadius: 4, padding: "7px 8px", fontSize: 12, background: "#fff" }} />
            <span style={{ fontSize: 11, color: "#7A7472" }}>DWG com os motivos da reprovação marcados — vários DWG num .zip. PDF também. Até 15 MB.</span>
          </label>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {state?.error && <span style={{ fontSize: 12, color: "#8C2B22" }}>{state.error}</span>}
        <button
          type="submit"
          disabled={!podeEmitir || pending}
          style={{
            border: "1px solid #E01B22",
            background: bg,
            color: fg,
            borderRadius: 4,
            padding: "10px 16px",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: podeEmitir ? (pending ? "wait" : "pointer") : "not-allowed",
          }}
        >
          {pending ? "Emitindo…" : rotulo}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { enviarAlvaraAction } from "@/lib/actions/requerimento-actions";

export function EnviarAlvara({ solicitacaoId, recusa }: { solicitacaoId: string; recusa: string | null }) {
  const [state, formAction, pending] = useActionState(
    enviarAlvaraAction.bind(null, solicitacaoId),
    null as { error?: string } | null,
  );

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {recusa && (
        <div style={{ fontSize: 12.5, color: "#8C2B22", background: "#FDF6F5", border: "1px solid #E8C9C4", borderRadius: 4, padding: "11px 13px", lineHeight: 1.45 }}>
          <strong>Alvará recusado pela CAPE:</strong> {recusa}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <input
          type="file"
          name="alvara"
          accept=".pdf"
          required
          style={{ display: "none" }}
          id={`alvara-${solicitacaoId}`}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
        <label
          htmlFor={`alvara-${solicitacaoId}`}
          style={{ border: "1px solid #12455E", background: "#12455E", color: "#fff", borderRadius: 4, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: pending ? "wait" : "pointer" }}
        >
          {pending ? "Enviando…" : recusa ? "Enviar novo alvará" : "Enviar alvará de execução"}
        </label>
        <span style={{ fontSize: 11.5, color: "#6B7480" }}>
          PDF, até 5 MB. A CAPE confere antes de liberar o início da obra.
        </span>
      </div>
      {state?.error && <div style={{ fontSize: 12, color: "#8C2B22" }}>{state.error}</div>}
    </form>
  );
}

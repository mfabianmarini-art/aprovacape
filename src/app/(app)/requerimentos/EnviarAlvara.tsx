"use client";

import { useActionState, useRef, useState } from "react";
import { enviarAlvaraAction } from "@/lib/actions/requerimento-actions";

export function EnviarAlvara({ solicitacaoId, recusa }: { solicitacaoId: string; recusa: string | null }) {
  const [state, formAction, pending] = useActionState(
    enviarAlvaraAction.bind(null, solicitacaoId),
    null as { error?: string } | null,
  );
  // Escolher o arquivo não envia: o envio tranca a solicitação em conferência da CAPE,
  // e o proprietário confere o nome antes de confirmar.
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {recusa && (
        <div style={{ fontSize: 12.5, color: "#8C2B22", background: "#FDF6F5", border: "1px solid #E8C9C4", borderRadius: 4, padding: "11px 13px", lineHeight: 1.45 }}>
          <strong>Alvará recusado pela CAPE:</strong> {recusa}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <input
          ref={inputRef}
          type="file"
          name="alvara"
          accept=".pdf"
          required
          style={{ display: "none" }}
          id={`alvara-${solicitacaoId}`}
          onChange={(e) => setEscolhido(e.target.files?.[0]?.name ?? null)}
        />
        <label
          htmlFor={`alvara-${solicitacaoId}`}
          style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#12455E", borderRadius: 4, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
        >
          {escolhido ? "Trocar arquivo" : recusa ? "Escolher novo alvará" : "Escolher arquivo do alvará"}
        </label>

        {escolhido ? (
          <span style={{ fontSize: 12, color: "#3B4653", fontFamily: "var(--font-mono)" }}>{escolhido}</span>
        ) : (
          <span style={{ fontSize: 11.5, color: "#6B7480" }}>
            PDF, até 5 MB. A CAPE confere antes de liberar o início da obra.
          </span>
        )}
      </div>

      {escolhido && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={pending}
            style={{ border: "1px solid #12455E", background: "#12455E", color: "#fff", borderRadius: 4, padding: "9px 16px", fontSize: 12.5, fontWeight: 600, cursor: pending ? "wait" : "pointer" }}
          >
            {pending ? "Enviando…" : "Confirmar envio do alvará"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = "";
              setEscolhido(null);
            }}
            style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#4A5563", borderRadius: 4, padding: "9px 12px", fontSize: 12.5, cursor: "pointer" }}
          >
            Cancelar
          </button>
          <span style={{ fontSize: 11.5, color: "#6B7480" }}>
            Depois de confirmar, a solicitação fica em conferência até a CAPE aceitar.
          </span>
        </div>
      )}

      {state?.error && <div style={{ fontSize: 12, color: "#8C2B22" }}>{state.error}</div>}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { reenviarAcessoProprietarioAction, type ReenvioAcessoState } from "@/lib/actions/analise-actions";

export function AcessoProprietario({
  solicitacaoId,
  email,
  enviadoEm,
}: {
  solicitacaoId: string;
  email: string | null;
  // Já formatado no servidor, no fuso de Brasília.
  enviadoEm: string | null;
}) {
  const [state, formAction, pending] = useActionState<ReenvioAcessoState, FormData>(
    reenviarAcessoProprietarioAction.bind(null, solicitacaoId),
    null,
  );

  return (
    <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: "16px 17px", display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#7A7472" }}>Acesso do proprietário</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: enviadoEm ? "#24603A" : "#8A5210" }}>
        {enviadoEm
          ? `Protocolo e senha enviados para ${email} em ${enviadoEm}.`
          : email
            ? `O e-mail automático para ${email} não foi enviado.`
            : "Protocolo anterior ao envio automático: sem e-mail do proprietário."}
      </div>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (enviadoEm && !confirm("Reenviar com uma senha nova? A senha atual do proprietário deixa de funcionar.")) e.preventDefault();
        }}
        style={{ display: "flex", flexDirection: "column", gap: 7 }}
      >
        <input
          name="proprietarioEmail"
          type="email"
          required
          defaultValue={email ?? ""}
          placeholder="e-mail do proprietário"
          style={{ border: "1px solid #DDD8CE", borderRadius: 4, padding: "8px 9px", fontSize: 12.5 }}
        />
        <button
          type="submit"
          disabled={pending}
          style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#E01B22", borderRadius: 4, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: pending ? "wait" : "pointer" }}
        >
          {pending ? "Enviando…" : enviadoEm ? "Reenviar com nova senha" : "Enviar acesso"}
        </button>
      </form>
      {state?.ok && <div style={{ fontSize: 12, color: "#24603A" }}>{state.ok}</div>}
      {state?.error && <div style={{ fontSize: 12, color: "#8C2B22" }}>{state.error}</div>}
    </section>
  );
}

"use client";

import { useActionState } from "react";
import { redefinirSenhaAction, type RedefinirSenhaState } from "@/lib/actions/senha-actions";

const inputStyle: React.CSSProperties = { border: "1px solid #DDD8CE", borderRadius: 4, padding: "11px 12px", fontSize: 14 };
const labelTextStyle: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" };

export function RedefinirSenhaForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<RedefinirSenhaState, FormData>(redefinirSenhaAction, null);

  return (
    <form
      action={formAction}
      style={{ background: "#fff", border: "1px solid #DDD8CE", borderTop: "3px solid #E01B22", borderRadius: 4, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}
    >
      <input type="hidden" name="token" value={token} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, lineHeight: 1.1 }}>Crie uma nova senha</div>
        <div style={{ fontSize: 12.5, color: "#4A5563", lineHeight: 1.55 }}>
          Use pelo menos 8 caracteres — uma frase longa é mais segura e mais fácil de lembrar do que uma senha curta cheia de
          símbolos. Ao salvar, as sessões abertas em outros dispositivos são encerradas.
        </div>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Nova senha</span>
        <input name="senha" type="password" required minLength={8} maxLength={72} autoComplete="new-password" autoFocus style={inputStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Confirme a nova senha</span>
        <input name="confirmarSenha" type="password" required minLength={8} maxLength={72} autoComplete="new-password" style={inputStyle} />
      </label>
      {state?.error && <div role="alert" style={{ fontSize: 12.5, color: "#8C2B22" }}>{state.error}</div>}
      <button
        type="submit"
        disabled={pending}
        style={{ border: "1px solid #E01B22", background: "#E01B22", color: "#fff", borderRadius: 4, padding: "12px 16px", fontSize: 13, fontWeight: 600, cursor: pending ? "wait" : "pointer" }}
      >
        {pending ? "Salvando…" : "Salvar nova senha"}
      </button>
    </form>
  );
}

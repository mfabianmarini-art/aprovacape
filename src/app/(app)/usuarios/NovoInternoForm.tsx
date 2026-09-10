"use client";

import { useActionState, useState } from "react";
import { criarUsuarioInternoAction, type NovoInternoState } from "@/lib/actions/usuarios-actions";

const inputStyle: React.CSSProperties = { border: "1px solid #DDD8CE", borderRadius: 4, padding: "10px 11px", fontSize: 13.5, background: "#fff" };
const labelTextStyle: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#6B7480" };

export function NovoInternoForm({ podeAtribuirAdmin }: { podeAtribuirAdmin: boolean }) {
  const [state, formAction, pending] = useActionState<NovoInternoState, FormData>(criarUsuarioInternoAction, null);
  const [perfil, setPerfil] = useState<"ADMIN_CAPE" | "CAPE_ANALISTA">("CAPE_ANALISTA");

  if (state?.ok) {
    return (
      <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: 18, display: "flex", flexDirection: "column", gap: 13 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>Conta criada</div>
        <div style={{ fontSize: 12.5, color: "#4A5563", lineHeight: 1.5 }}>
          Sem envio de e-mail configurado nesta instalação — compartilhe a senha temporária abaixo com a pessoa por um canal seguro. Ela deve trocá-la no primeiro acesso.
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, background: "#FAF9F6", border: "1px solid #EDE9E1", borderRadius: 4, padding: "10px 12px" }}>
          {state.senhaTemp}
        </div>
      </section>
    );
  }

  return (
    <form action={formAction} style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: 18, display: "flex", flexDirection: "column", gap: 13 }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>Novo membro</div>
      <div style={{ fontSize: 12, color: "#4A5563", lineHeight: 1.5 }}>A equipe CAPE atende todos os empreendimentos — não há auto-cadastro para estes perfis.</div>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Perfil</span>
        <select name="perfil" value={perfil} onChange={(e) => setPerfil(e.target.value as typeof perfil)} style={inputStyle}>
          <option value="CAPE_ANALISTA">Analista CAPE</option>
          {podeAtribuirAdmin && <option value="ADMIN_CAPE">Admin CAPE</option>}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Nome completo</span>
        <input name="nome" required style={inputStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>E-mail corporativo</span>
        <input name="email" required type="email" style={inputStyle} />
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14, border: "1px solid #B4711A", borderRadius: 4, background: "#FDF8EE" }}>
        <div style={labelTextStyle}>Habilitação profissional obrigatória</div>
        <div style={{ fontSize: 12.5, color: "#3B4653", lineHeight: 1.45 }}>
          Perfis técnicos só são ativados com registro válido de engenheiro(a) ou arquiteto(a).
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelTextStyle}>Conselho e nº de registro</span>
          <input name="registro" placeholder="CAU A000000-0 / CREA 0000000/D" style={inputStyle} />
        </label>
      </div>
      {state?.error && <div style={{ fontSize: 12, color: "#8C2B22" }}>{state.error}</div>}
      <button
        type="submit"
        disabled={pending}
        style={{ border: "1px solid #12455E", background: "#12455E", color: "#fff", borderRadius: 4, padding: "11px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
      >
        {pending ? "Criando…" : "Cadastrar usuário"}
      </button>
    </form>
  );
}

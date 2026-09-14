"use client";

import { useActionState, useState } from "react";
import { enviarSolicitacaoAction } from "@/lib/actions/nova-actions";
import type { Role } from "@/generated/prisma/enums";

const inputStyle: React.CSSProperties = { border: "1px solid #DDD8CE", borderRadius: 4, padding: "10px 11px", fontSize: 13.5 };
const labelTextStyle: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" };

const DECLARACOES = [
  { id: "d1", texto: "Declaro que a aprovação pela CAPE não substitui as aprovações legais junto aos órgãos públicos competentes, cabendo a mim e ao responsável técnico a regularidade legal da obra." },
  { id: "d2", texto: "Declaro ciência de que o início da obra depende da apresentação do projeto aprovado pela Prefeitura e do respectivo alvará de execução." },
  { id: "d3", texto: "Declaro ciência de que alterações no projeto aprovado pela Prefeitura em relação ao aprovado pelo residencial exigem nova análise e substituição do projeto." },
] as const;

export function Step3Send({
  rascunho,
  sessionUser,
}: {
  rascunho: { id: string };
  sessionUser: { name: string; role: Role };
}) {
  const [state, formAction, pending] = useActionState(enviarSolicitacaoAction, null as { error?: string } | null);
  const [decl, setDecl] = useState({ d1: false, d2: false, d3: false });
  const podeEnviar = decl.d1 && decl.d2 && decl.d3;

  return (
    <form action={formAction} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="hidden" name="solicitacaoId" value={rascunho.id} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelTextStyle}>Responsável técnico</span>
          <input name="rtNome" required defaultValue={sessionUser.role === "RESPONSAVEL_TECNICO" ? sessionUser.name : ""} style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelTextStyle}>Registro CAU / CREA</span>
          <input name="rtRegistro" required style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelTextStyle}>E-mail para notificações</span>
          <input name="rtEmail" required type="email" style={inputStyle} />
        </label>
      </div>

      <div style={{ background: "#FAF9F6", border: "1px solid #EDE9E1", borderRadius: 4, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={labelTextStyle}>Declarações obrigatórias</div>
        {DECLARACOES.map((d) => (
          <label key={d.id} style={{ display: "grid", gridTemplateColumns: "18px 1fr", gap: 10, alignItems: "start", cursor: "pointer" }}>
            <input
              type="checkbox"
              name={d.id}
              checked={decl[d.id]}
              onChange={(e) => setDecl((s) => ({ ...s, [d.id]: e.target.checked }))}
              style={{ width: 16, height: 16, marginTop: 2, accentColor: "#E01B22", cursor: "pointer" }}
            />
            <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "#3B4653" }}>{d.texto}</span>
          </label>
        ))}
      </div>

      {state?.error && <div style={{ fontSize: 12.5, color: "#8C2B22" }}>{state.error}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12.5, color: podeEnviar ? "#24603A" : "#8A5210", maxWidth: "60ch", lineHeight: 1.45 }}>
          {podeEnviar ? "Pronto para envio." : "Aceite as três declarações para enviar."}
        </div>
        <div style={{ display: "flex", gap: 9 }}>
          <a
            href={`/nova?rascunho=${rascunho.id}&passo=2`}
            style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#E01B22", borderRadius: 4, padding: "10px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
          >
            Voltar
          </a>
          <button
            type="submit"
            disabled={!podeEnviar || pending}
            style={{
              border: "1px solid #E01B22",
              background: podeEnviar ? "#E01B22" : "#EDE9E1",
              color: podeEnviar ? "#FFFFFF" : "#8B939C",
              borderRadius: 4,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: podeEnviar ? "pointer" : "not-allowed",
            }}
          >
            {pending ? "Enviando…" : "Enviar solicitação"}
          </button>
        </div>
      </div>
    </form>
  );
}

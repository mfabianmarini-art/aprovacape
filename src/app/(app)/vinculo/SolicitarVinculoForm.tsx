"use client";

import { useActionState, useState } from "react";
import { solicitarVinculoAction, type VinculoState } from "@/lib/actions/vinculo-actions";
import { ACCEPT_AUTORIZACAO } from "@/lib/vinculo-comprovacao";
import type { getEmpreendimentosParaVinculo } from "@/lib/queries/vinculo";

type Empreendimentos = Awaited<ReturnType<typeof getEmpreendimentosParaVinculo>>;

const inputStyle: React.CSSProperties = { border: "1px solid #DDD8CE", borderRadius: 4, padding: "10px 11px", fontSize: 13.5, background: "#fff" };
const labelTextStyle: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" };

export function SolicitarVinculoForm({ empreendimentos, ehRT }: { empreendimentos: Empreendimentos; ehRT: boolean }) {
  const [state, formAction, pending] = useActionState<VinculoState, FormData>(solicitarVinculoAction, null);
  const [empId, setEmpId] = useState(empreendimentos[0]?.id ?? "");
  const emp = empreendimentos.find((e) => e.id === empId) ?? empreendimentos[0];
  const [quadraId, setQuadraId] = useState(emp?.quadras[0]?.id ?? "");
  const quadra = emp?.quadras.find((q) => q.id === quadraId) ?? emp?.quadras[0];

  if (state?.ok) {
    return (
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ background: "#F3F8F4", border: "1px solid #C6DAC9", borderRadius: 4, padding: "14px 16px", fontSize: 13, color: "#24603A", lineHeight: 1.5 }}>
          Pedido enviado. A CAPE confere o vínculo e, aprovado, o lote passa a aparecer em Nova solicitação.
        </div>
        <a href="/requerimentos" style={{ alignSelf: "flex-start", fontSize: 13, fontWeight: 600 }}>
          Voltar para Meus requerimentos
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 90px 90px", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelTextStyle}>Empreendimento</span>
          <select
            value={empId}
            onChange={(e) => {
              setEmpId(e.target.value);
              const next = empreendimentos.find((x) => x.id === e.target.value);
              setQuadraId(next?.quadras[0]?.id ?? "");
            }}
            style={inputStyle}
          >
            {empreendimentos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome} — {e.cidade}/{e.uf}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelTextStyle}>Quadra</span>
          <select value={quadraId} onChange={(e) => setQuadraId(e.target.value)} style={{ ...inputStyle, padding: "10px 8px" }}>
            {emp?.quadras.map((q) => (
              <option key={q.id} value={q.id}>
                {q.nome}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelTextStyle}>Lote</span>
          {/* key reinicia a seleção quando a quadra muda, senão o navegador guarda o índice anterior */}
          <select key={quadra?.id} name="loteId" required style={{ ...inputStyle, padding: "10px 8px" }}>
            {quadra?.lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.numero}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>{ehRT ? "Autorização do proprietário" : "Matrícula do lote ou código de convite"}</span>
        {ehRT ? (
          <>
            <input name="autorizacao" type="file" required accept={ACCEPT_AUTORIZACAO} style={{ ...inputStyle, fontSize: 12.5 }} />
            <span style={{ fontSize: 11.5, color: "#7A7472" }}>
              Procuração ou contrato assinado pelo proprietário — PDF, Word ou imagem, até 10 MB.
            </span>
          </>
        ) : (
          <input name="comprovacao" required placeholder="000.000 / CONV-0000" style={inputStyle} />
        )}
      </label>

      {state?.error && <div style={{ fontSize: 12.5, color: "#8C2B22" }}>{state.error}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 9, borderTop: "1px solid #EDE9E1", paddingTop: 16 }}>
        <a
          href="/requerimentos"
          style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#E01B22", borderRadius: 4, padding: "10px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
        >
          Voltar
        </a>
        <button
          type="submit"
          disabled={pending}
          style={{ border: "1px solid #E01B22", background: "#E01B22", color: "#fff", borderRadius: 4, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: pending ? "wait" : "pointer" }}
        >
          {pending ? "Enviando…" : "Solicitar vínculo"}
        </button>
      </div>
    </form>
  );
}

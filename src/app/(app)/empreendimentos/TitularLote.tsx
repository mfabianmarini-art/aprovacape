"use client";

import { useActionState, useState } from "react";
import { atualizarTitularLoteAction, desvincularContaLoteAction, type TitularState } from "@/lib/actions/lote-actions";
import { formatarCpf, mesmoCpf } from "@/lib/cpf";
import { formatDate } from "@/lib/status";

const input: React.CSSProperties = {
  border: "1px solid #DDD8CE",
  borderRadius: 4,
  padding: "7px 9px",
  fontSize: 12,
  background: "#fff",
  width: "100%",
};

// Proprietário conforme a matrícula. É o dado que a aprovação de vínculo confere, e o
// lugar onde uma venda do imóvel é registrada.
export function TitularLote({
  loteId,
  titularNome,
  titularCpf,
  titularAtualizadoEm,
  proprietarioNome,
  proprietarioCpf,
}: {
  loteId: string;
  titularNome: string | null;
  titularCpf: string | null;
  titularAtualizadoEm: Date | null;
  proprietarioNome: string | null;
  proprietarioCpf: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<TitularState, FormData>(
    atualizarTitularLoteAction.bind(null, loteId),
    null,
  );

  // A conta vinculada continua sendo a do dono anterior depois de uma venda: ela enxerga
  // o lote inteiro até alguém desvincular.
  const contaDesatualizada = !!titularCpf && !!proprietarioCpf && !mesmoCpf(titularCpf, proprietarioCpf);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px dashed #EDE9E1", paddingTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap", fontSize: 11 }}>
        <span style={{ color: titularNome ? "#4A5563" : "#8B939C", fontStyle: titularNome ? "normal" : "italic" }}>
          {titularNome
            ? `Proprietário na matrícula: ${titularNome} · ${formatarCpf(titularCpf ?? "")}`
            : "proprietário da matrícula não cadastrado"}
          {titularAtualizadoEm && ` · atualizado em ${formatDate(titularAtualizadoEm)}`}
        </span>
        <button
          type="button"
          onClick={() => setAberto(!aberto)}
          style={{ border: 0, background: "transparent", color: "#E01B22", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0 }}
        >
          {aberto ? "cancelar" : titularNome ? "alterar proprietário" : "cadastrar proprietário"}
        </button>
      </div>

      {contaDesatualizada && (
        <div style={{ fontSize: 11, color: "#8C2B22", background: "#FDF6F5", border: "1px solid #E8C9C4", borderRadius: 4, padding: "8px 10px", lineHeight: 1.45, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
          <span>
            A conta vinculada ao lote é de {proprietarioNome} ({formatarCpf(proprietarioCpf ?? "")}), que não é o
            proprietário da matrícula. Ela continua vendo tudo deste lote.
          </span>
          <form action={desvincularContaLoteAction.bind(null, loteId, "proprietario")}>
            <button
              type="submit"
              style={{ border: "1px solid #8C2B22", background: "#fff", color: "#8C2B22", borderRadius: 4, padding: "5px 9px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
            >
              Desvincular esta conta do lote
            </button>
          </form>
        </div>
      )}

      {aberto && (
        <form action={formAction} style={{ display: "grid", gridTemplateColumns: "1fr 130px auto", gap: 6, alignItems: "start" }}>
          <input name="nome" defaultValue={titularNome ?? ""} placeholder="Nome como consta na matrícula" required style={input} />
          <input name="cpf" defaultValue={titularCpf ? formatarCpf(titularCpf) : ""} placeholder="000.000.000-00" required style={{ ...input, fontFamily: "var(--font-mono)" }} />
          <button
            type="submit"
            disabled={pending}
            style={{ border: "1px solid #E01B22", background: "#E01B22", color: "#fff", borderRadius: 4, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: pending ? "wait" : "pointer" }}
          >
            {pending ? "Salvando…" : "Salvar"}
          </button>
          {state?.error && <div style={{ gridColumn: "1/-1", fontSize: 11.5, color: "#8C2B22" }}>{state.error}</div>}
        </form>
      )}
    </div>
  );
}

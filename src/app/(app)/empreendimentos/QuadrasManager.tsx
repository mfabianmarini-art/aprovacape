"use client";

import { useActionState } from "react";
import { addQuadraAction, updateQuadraAction, deleteQuadraAction, type QuadraState } from "@/lib/actions/empreendimento-actions";
import { EditableField } from "@/components/EditableField";

type QuadraCfg = {
  id: string;
  nome: string;
  total: number;
  lotes: { id: string; numero: string; cor: string }[];
};

const nomeFieldStyle: React.CSSProperties = {
  border: "1px solid transparent",
  background: "transparent",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 600,
  padding: "4px 6px",
  borderRadius: 3,
  width: "100%",
};

const totalFieldStyle: React.CSSProperties = {
  border: "1px solid transparent",
  background: "transparent",
  fontSize: 11.5,
  color: "#6B7480",
  fontFamily: "var(--font-mono)",
  textAlign: "right",
  padding: "4px 6px",
  borderRadius: 3,
  width: "100%",
};

export function QuadrasManager({ empreendimentoId, quadras }: { empreendimentoId: string; quadras: QuadraCfg[] }) {
  const action = addQuadraAction.bind(null, empreendimentoId);
  const [state, formAction, pending] = useActionState<QuadraState, FormData>(action, null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#6B7480" }}>Quadras e lotes</div>
      {quadras.length === 0 && (
        <div style={{ fontSize: 12.5, color: "#6B7480" }}>Nenhuma quadra cadastrada ainda.</div>
      )}
      {quadras.map((q) => {
        const temLotes = q.lotes.length > 0;
        return (
          <div
            key={q.id}
            style={{ display: "grid", gridTemplateColumns: "90px 1fr 90px 34px", alignItems: "center", gap: 12, border: "1px solid #EDE9E1", borderRadius: 4, padding: "9px 12px" }}
          >
            <EditableField defaultValue={q.nome} onSave={updateQuadraAction.bind(null, q.id, "nome")} style={nomeFieldStyle} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {q.lotes.map((l) => (
                <span key={l.id} title={`L${l.numero}`} style={{ width: 17, height: 17, borderRadius: 2, background: l.cor, display: "block" }} />
              ))}
            </div>
            <EditableField
              defaultValue={String(q.total)}
              onSave={updateQuadraAction.bind(null, q.id, "totalLotes")}
              style={totalFieldStyle}
            />
            <form action={deleteQuadraAction.bind(null, q.id)}>
              <button
                type="submit"
                disabled={temLotes}
                title={temLotes ? "Quadra com lotes cadastrados não pode ser removida" : "Remover quadra"}
                style={{
                  border: "1px solid #EDE9E1",
                  background: "#fff",
                  color: temLotes ? "#C9C2B4" : "#8C2B22",
                  borderRadius: 4,
                  padding: "6px 0",
                  fontSize: 13,
                  cursor: temLotes ? "not-allowed" : "pointer",
                  width: "100%",
                }}
              >
                ×
              </button>
            </form>
          </div>
        );
      })}
      <form action={formAction} style={{ display: "grid", gridTemplateColumns: "1fr 90px auto", gap: 8 }}>
        <input
          name="nome"
          placeholder="Nome da quadra (A, B, A1, F2…)"
          required
          style={{ border: "1px dashed #C9C2B4", borderRadius: 4, padding: "8px 10px", fontSize: 13 }}
        />
        <input
          name="totalLotes"
          type="number"
          min={1}
          placeholder="Lotes"
          required
          style={{ border: "1px dashed #C9C2B4", borderRadius: 4, padding: "8px 10px", fontSize: 13, fontFamily: "var(--font-mono)" }}
        />
        <button
          type="submit"
          disabled={pending}
          style={{ border: "1px dashed #C9C2B4", background: "#fff", color: "#12455E", borderRadius: 4, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          {pending ? "Adicionando…" : "+ quadra"}
        </button>
      </form>
      {state?.error && <div style={{ fontSize: 11.5, color: "#8C2B22" }}>{state.error}</div>}
    </div>
  );
}

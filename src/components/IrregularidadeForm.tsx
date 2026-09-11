"use client";

import { useActionState, useState } from "react";
import { registrarIrregularidadeAction, type IrregularidadeState } from "@/lib/actions/analise-actions";
import { IRREGULARIDADE_LABEL } from "@/lib/status";

const inputStyle: React.CSSProperties = {
  border: "1px solid #DDD8CE",
  borderRadius: 4,
  padding: "9px 11px",
  fontSize: 12.5,
  background: "#fff",
  fontFamily: "inherit",
};
const labelStyle: React.CSSProperties = {
  fontSize: 10.5,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "#6B7480",
};

// Formulário sempre aberto. Quem controla a abertura é a tela: na ficha de análise é o
// próprio botão abaixo; na lista de obras em andamento, a linha, que abre o painel
// ocupando a largura toda.
export function IrregularidadeForm({
  solicitacaoId,
  onCancelar,
}: {
  solicitacaoId: string;
  onCancelar: () => void;
}) {
  const [state, formAction, pending] = useActionState<IrregularidadeState, FormData>(
    registrarIrregularidadeAction.bind(null, solicitacaoId),
    null,
  );
  const [arquivos, setArquivos] = useState<string[]>([]);

  return (
    <form
      action={formAction}
      // Remontar após o sucesso limpa os campos sem mexer em estado durante a render.
      key={state?.ok ? "registrada" : "nova"}
      style={{ display: "flex", flexDirection: "column", gap: 11, border: "1px solid #E8C9C4", background: "#FDF6F5", borderRadius: 4, padding: 15 }}
    >
      {state?.ok ? (
        <div style={{ fontSize: 12.5, color: "#24603A", lineHeight: 1.45 }}>
          Irregularidade registrada — ela já está visível ao síndico, ao proprietário e ao RT.
          Preencha abaixo se houver outra.
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: "#8C2B22", lineHeight: 1.45 }}>
          O registro fica visível ao síndico, ao proprietário e ao responsável técnico.
        </div>
      )}

      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={labelStyle}>Irregularidade constatada</span>
        <select name="tipo" defaultValue="DIVERGENCIA_PROJETO" style={inputStyle}>
          {Object.entries(IRREGULARIDADE_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={labelStyle}>Relatório detalhado</span>
        <textarea
          name="descricao"
          rows={5}
          required
          placeholder="O que foi constatado, onde, e o que precisa ser feito para regularizar."
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.45 }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={labelStyle}>Evidências (fotos ou PDF, até 8 arquivos de 5 MB)</span>
        <input
          type="file"
          name="evidencias"
          multiple
          accept="image/png,image/jpeg,image/webp,.pdf"
          onChange={(e) => setArquivos(Array.from(e.target.files ?? []).map((f) => f.name))}
          style={{ fontSize: 12 }}
        />
        {arquivos.length > 0 && (
          <span style={{ fontSize: 11.5, color: "#4A5563", fontFamily: "var(--font-mono)" }}>
            {arquivos.length} arquivo(s): {arquivos.join(", ")}
          </span>
        )}
      </label>

      {state?.error && <div style={{ fontSize: 12, color: "#8C2B22" }}>{state.error}</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={pending}
          style={{ border: "1px solid #8C2B22", background: "#8C2B22", color: "#fff", borderRadius: 4, padding: "9px 15px", fontSize: 12.5, fontWeight: 600, cursor: pending ? "wait" : "pointer" }}
        >
          {pending ? "Registrando…" : "Registrar e notificar"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#4A5563", borderRadius: 4, padding: "9px 12px", fontSize: 12.5, cursor: "pointer" }}
        >
          {state?.ok ? "Fechar" : "Cancelar"}
        </button>
      </div>
    </form>
  );
}

// Botão + formulário, para a ficha de análise, onde não há painel de linha.
export function IrregularidadeBotao({ solicitacaoId }: { solicitacaoId: string }) {
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        style={{ alignSelf: "flex-start", border: "1px solid #8C2B22", background: "#fff", color: "#8C2B22", borderRadius: 4, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
      >
        Registrar irregularidade na obra
      </button>
    );
  }

  return <IrregularidadeForm solicitacaoId={solicitacaoId} onCancelar={() => setAberto(false)} />;
}

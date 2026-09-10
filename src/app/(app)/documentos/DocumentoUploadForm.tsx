"use client";

import { useActionState } from "react";
import { uploadDocumentoTecnicoAction, type DocumentoTecnicoState } from "@/lib/actions/documento-tecnico-actions";
import { CATEGORIA_DOC_TECNICO_LABEL } from "@/lib/status";

const inputStyle: React.CSSProperties = { border: "1px solid #DDD8CE", borderRadius: 4, padding: "10px 11px", fontSize: 13.5, background: "#fff" };
const labelTextStyle: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#6B7480" };

export function DocumentoUploadForm({ empreendimentoId }: { empreendimentoId: string }) {
  const action = uploadDocumentoTecnicoAction.bind(null, empreendimentoId);
  const [state, formAction, pending] = useActionState<DocumentoTecnicoState, FormData>(action, null);

  return (
    <form
      action={formAction}
      key={state?.ok ? "enviado" : "pendente"}
      style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: 18, display: "flex", flexDirection: "column", gap: 13 }}
    >
      <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
        Novo documento
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Categoria</span>
        <select name="categoria" defaultValue="MANUAL_PROPRIETARIO" style={inputStyle}>
          {Object.entries(CATEGORIA_DOC_TECNICO_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Título</span>
        <input name="titulo" required placeholder="Ex.: Manual do proprietário 2026" style={inputStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Descrição (opcional)</span>
        <textarea
          name="descricao"
          rows={3}
          maxLength={600}
          placeholder="Do que trata este documento e o que o proprietário/RT deve observar nele."
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.45 }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Arquivo (PDF, Word ou imagem, até 20 MB)</span>
        <input name="arquivo" type="file" required accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp" style={{ fontSize: 12.5 }} />
      </label>
      {state?.error && <div style={{ fontSize: 12, color: "#8C2B22" }}>{state.error}</div>}
      {state?.ok && <div style={{ fontSize: 12, color: "#24603A" }}>Documento enviado.</div>}
      <button
        type="submit"
        disabled={pending}
        style={{ border: "1px solid #12455E", background: "#12455E", color: "#fff", borderRadius: 4, padding: "11px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
      >
        {pending ? "Enviando…" : "Enviar documento"}
      </button>
    </form>
  );
}

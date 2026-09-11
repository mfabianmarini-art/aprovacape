"use client";

import { useActionState } from "react";
import { uploadDocumentoAction } from "@/lib/actions/nova-actions";
import { DOC_LABEL, DOC_ORDER, DOC_REGRAS, formatosAceitos } from "@/lib/status";
import type { DocumentoTipo } from "@/generated/prisma/enums";

type Documento = { id: string; tipo: DocumentoTipo; nomeArquivo: string; observacao: string | null };

function Linha({ solicitacaoId, tipo, doc }: { solicitacaoId: string; tipo: DocumentoTipo; doc?: Documento }) {
  const [state, formAction, pending] = useActionState(
    uploadDocumentoAction.bind(null, solicitacaoId, tipo),
    null as { error?: string } | null,
  );
  const apontado = !!doc?.observacao;

  return (
    <form
      action={formAction}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 12,
        padding: "11px 13px",
        border: `1px solid ${apontado ? "#E8D7B4" : "#EDE9E1"}`,
        background: apontado ? "#FFFDF8" : "#fff",
        borderRadius: 4,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>
          {DOC_LABEL[tipo].nome}{" "}
          <span style={{ fontSize: 11, fontWeight: 400, color: "#6B7480", fontFamily: "var(--font-mono)" }}>
            {formatosAceitos(tipo)}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: "#6B7480", overflow: "hidden", textOverflow: "ellipsis" }}>
          {doc ? doc.nomeArquivo : "Ainda não enviado"}
        </div>
        {state?.error && <div style={{ fontSize: 11.5, color: "#8C2B22" }}>{state.error}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        {apontado && (
          <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "#8A5210" }}>apontado</span>
        )}
        <input
          type="file"
          name="arquivo"
          accept={DOC_REGRAS[tipo].extensoes.join(",")}
          required
          style={{ display: "none" }}
          id={`sub-${solicitacaoId}-${tipo}`}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
        <label
          htmlFor={`sub-${solicitacaoId}-${tipo}`}
          style={{
            border: "1px solid #DDD8CE",
            background: "#fff",
            color: "#12455E",
            borderRadius: 4,
            padding: "6px 11px",
            fontSize: 12,
            fontWeight: 600,
            cursor: pending ? "wait" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {pending ? "Enviando…" : doc ? "Substituir" : "Enviar"}
        </label>
      </div>
    </form>
  );
}

export function SubstituirDocumentos({ solicitacaoId, documentos }: { solicitacaoId: string; documentos: Documento[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#6B7480" }}>
        Substituir documentos antes de reenviar
      </div>
      {DOC_ORDER.map((tipo) => (
        <Linha key={tipo} solicitacaoId={solicitacaoId} tipo={tipo} doc={documentos.find((d) => d.tipo === tipo)} />
      ))}
    </div>
  );
}

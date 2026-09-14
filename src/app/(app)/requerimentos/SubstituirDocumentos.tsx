"use client";

import { useActionState } from "react";
import { uploadDocumentoAction } from "@/lib/actions/nova-actions";
import { DOC_LABEL, DOC_ORDER, DOC_REGRAS, formatosAceitos } from "@/lib/status";
import type { DocumentoTipo } from "@/generated/prisma/enums";

type Documento = {
  id: string;
  tipo: DocumentoTipo;
  nomeArquivo: string;
  observacao: string | null;
  validado: boolean;
};

function Linha({
  solicitacaoId,
  tipo,
  doc,
  liberado,
}: {
  solicitacaoId: string;
  tipo: DocumentoTipo;
  doc?: Documento;
  liberado: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    uploadDocumentoAction.bind(null, solicitacaoId, tipo),
    null as { error?: string } | null,
  );

  return (
    <form
      action={formAction}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 12,
        padding: "11px 13px",
        border: `1px solid ${liberado ? "#E8D7B4" : "#EDE9E1"}`,
        background: liberado ? "#FFFDF8" : "#FBFAF7",
        borderRadius: 4,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: liberado ? "#231F20" : "#7A828C" }}>
          {DOC_LABEL[tipo].nome}
          {liberado && (
            <span style={{ fontSize: 11, fontWeight: 400, color: "#7A7472", fontFamily: "var(--font-mono)" }}>
              {" "}
              {formatosAceitos(tipo)}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: "#7A7472", overflow: "hidden", textOverflow: "ellipsis" }}>
          {doc ? doc.nomeArquivo : "Ainda não enviado"}
        </div>
        {state?.error && <div style={{ fontSize: 11.5, color: "#8C2B22" }}>{state.error}</div>}
      </div>

      {liberado ? (
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
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
              border: "1px solid #B4711A",
              background: "#fff",
              color: "#8A5210",
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
      ) : (
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#24603A", whiteSpace: "nowrap" }}>
          validado · mantém
        </span>
      )}
    </form>
  );
}

export function SubstituirDocumentos({
  solicitacaoId,
  documentos,
  devolvidaNoChecklist,
}: {
  solicitacaoId: string;
  documentos: Documento[];
  devolvidaNoChecklist: boolean;
}) {
  // Devolução na conferência documental aponta arquivos específicos: só eles trocam,
  // o que a CAPE já validou fica como está. Devolução no check-list é o projeto que
  // precisa mudar, e aí qualquer prancha pode ser reenviada.
  const liberado = (doc?: Documento) => devolvidaNoChecklist || !doc || !doc.validado;
  const alvos = DOC_ORDER.filter((t) => liberado(documentos.find((d) => d.tipo === t)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" }}>
        {devolvidaNoChecklist
          ? "Substituir documentos antes de reenviar"
          : `Substituir ${alvos.length === 1 ? "o documento apontado" : "os documentos apontados"} antes de reenviar`}
      </div>
      {DOC_ORDER.map((tipo) => {
        const doc = documentos.find((d) => d.tipo === tipo);
        return (
          <Linha key={tipo} solicitacaoId={solicitacaoId} tipo={tipo} doc={doc} liberado={liberado(doc)} />
        );
      })}
    </div>
  );
}

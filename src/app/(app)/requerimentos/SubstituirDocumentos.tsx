"use client";

import { useEnvioDocumento } from "@/components/useEnvioDocumento";
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
  trocado,
}: {
  solicitacaoId: string;
  tipo: DocumentoTipo;
  doc?: Documento;
  liberado: boolean;
  trocado: boolean;
}) {
  const { enviar, enviando, rotuloEnvio, erro } = useEnvioDocumento(solicitacaoId, tipo);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 12,
        padding: "11px 13px",
        border: `1px solid ${trocado ? "#C6DAC9" : liberado ? "#E8D7B4" : "#EDE9E1"}`,
        background: trocado ? "#F6FAF7" : liberado ? "#FFFDF8" : "#FBFAF7",
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
          {trocado && <span style={{ color: "#24603A", fontWeight: 600 }}> · substituído ✓</span>}
        </div>
        {erro && <div style={{ fontSize: 11.5, color: "#8C2B22" }}>{erro}</div>}
      </div>

      {liberado ? (
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <input
            type="file"
            name="arquivo"
            accept={DOC_REGRAS[tipo].extensoes.join(",")}
            disabled={enviando}
            style={{ display: "none" }}
            id={`sub-${solicitacaoId}-${tipo}`}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = "";
              if (file) enviar(file);
            }}
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
              cursor: enviando ? "wait" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {rotuloEnvio ?? (doc ? "Substituir" : "Enviar")}
          </label>
        </div>
      ) : (
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#24603A", whiteSpace: "nowrap" }}>
          validado · mantém
        </span>
      )}
    </div>
  );
}

export function SubstituirDocumentos({
  solicitacaoId,
  documentos,
  devolvidaNoChecklist,
  trocadosIds = [],
}: {
  solicitacaoId: string;
  documentos: Documento[];
  devolvidaNoChecklist: boolean;
  // Documentos enviados depois da devolução (já substituídos nesta rodada).
  trocadosIds?: string[];
}) {
  // Devolução na conferência documental aponta arquivos específicos: só eles trocam,
  // o que a CAPE já validou fica como está. Devolução no check-list é o projeto que
  // precisa mudar, e aí qualquer prancha pode ser reenviada.
  const liberado = (doc?: Documento) => devolvidaNoChecklist || !doc || !doc.validado;
  const alvos = DOC_ORDER.filter((t) => liberado(documentos.find((d) => d.tipo === t)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, color: "#4A5563", lineHeight: 1.45 }}>
        {devolvidaNoChecklist
          ? "Envie as pranchas e documentos corrigidos. Os que não mudaram podem ficar como estão."
          : `Substitua ${alvos.length === 1 ? "o documento apontado" : `os ${alvos.length} documentos apontados`}. Os já validados pela CAPE ficam como estão.`}
      </div>
      {DOC_ORDER.map((tipo) => {
        const doc = documentos.find((d) => d.tipo === tipo);
        return (
          <Linha key={tipo} solicitacaoId={solicitacaoId} tipo={tipo} doc={doc} liberado={liberado(doc)} trocado={!!doc && trocadosIds.includes(doc.id)} />
        );
      })}
    </div>
  );
}

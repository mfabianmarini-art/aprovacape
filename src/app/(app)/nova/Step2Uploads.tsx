"use client";

import { useActionState } from "react";
import { uploadDocumentoAction } from "@/lib/actions/nova-actions";
import { DOC_LABEL, DOC_ORDER, DOC_REGRAS, formatosAceitos } from "@/lib/status";
import type { DocumentoTipo } from "@/generated/prisma/enums";

type Rascunho = {
  id: string;
  documentos: { tipo: DocumentoTipo; nomeArquivo: string }[];
};

const DICAS: Record<DocumentoTipo, string> = {
  PROJETO_ARQUITETONICO: "Plantas, cortes, elevações e implantação no lote. Aceita DWG salvo em AutoCAD 2010/LT2010 — os demais documentos do check-list são só PDF.",
  ART_RRT_PROJETO: "Anotação de responsabilidade técnica quitada, do autor do projeto",
  ART_RRT_EXECUCAO: "Anotação de responsabilidade técnica quitada, de quem executa a obra",
  MEMORIAL_DESCRITIVO: "Materiais, acabamentos e sistema construtivo",
  PROJETO_PAISAGISTICO: "Implantação de jardins, paisagismo e áreas externas",
  CAPA_IPTU: "Capa do carnê ou guia do IPTU do lote",
  MATRICULA: "Matrícula atualizada do lote no cartório de registro de imóveis",
  LEVANTAMENTO_PLANIALTIMETRICO: "Levantamento planialtimétrico cadastral do lote",
  OUTROS: "Qualquer documento adicional relevante para a análise",
};

function UploadRow({
  solicitacaoId,
  tipo,
  existente,
  obrigatorio = true,
}: {
  solicitacaoId: string;
  tipo: DocumentoTipo;
  existente?: { nomeArquivo: string };
  obrigatorio?: boolean;
}) {
  const action = uploadDocumentoAction.bind(null, solicitacaoId, tipo);
  const [state, formAction, pending] = useActionState(action, null as { error?: string } | null);
  const ok = !!existente && !state?.error;

  return (
    <form
      action={formAction}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 190px",
        alignItems: "center",
        gap: 14,
        border: `1px dashed ${ok ? "#C6DAC9" : "#C9C2B4"}`,
        borderRadius: 4,
        padding: "14px 16px",
        background: ok ? "#FBFCFA" : "#FFFFFF",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>
          {DOC_LABEL[tipo].nome}{" "}
          <span style={{ fontSize: 11.5, fontWeight: 400, color: "#7A7472", fontFamily: "var(--font-mono)" }}>
            {formatosAceitos(tipo)}
          </span>
          {!obrigatorio && (
            <span style={{ fontSize: 11, fontWeight: 400, color: "#8B939C" }}> · opcional</span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: "#7A7472" }}>{existente ? existente.nomeArquivo : DICAS[tipo]}</div>
        {state?.error && <div style={{ fontSize: 11.5, color: "#8C2B22" }}>{state.error}</div>}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11.5, fontFamily: "var(--font-mono)", color: ok ? "#24603A" : obrigatorio ? "#8A5210" : "#8B939C" }}>
          {ok ? "enviado" : obrigatorio ? "pendente" : "não enviado"}
        </span>
        <input
          type="file"
          name="arquivo"
          accept={DOC_REGRAS[tipo].extensoes.join(",")}
          required={obrigatorio}
          style={{ display: "none" }}
          id={`file-${tipo}`}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
        <label
          htmlFor={`file-${tipo}`}
          style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#E01B22", borderRadius: 4, padding: "7px 11px", fontSize: 12, fontWeight: 600, cursor: pending ? "wait" : "pointer" }}
        >
          {pending ? "Enviando…" : existente ? "Substituir" : "Selecionar arquivo"}
        </label>
      </div>
    </form>
  );
}

export function Step2Uploads({ rascunho }: { rascunho: Rascunho }) {
  const enviados = DOC_ORDER.filter((t) => rascunho.documentos.find((d) => d.tipo === t)).length;
  const pendentes = DOC_ORDER.length - enviados;
  const outros = rascunho.documentos.find((d) => d.tipo === "OUTROS");

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      {DOC_ORDER.map((tipo) => (
        <UploadRow key={tipo} solicitacaoId={rascunho.id} tipo={tipo} existente={rascunho.documentos.find((d) => d.tipo === tipo)} />
      ))}
      <UploadRow solicitacaoId={rascunho.id} tipo="OUTROS" existente={outros} obrigatorio={false} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", borderTop: "1px solid #EDE9E1", paddingTop: 16 }}>
        <div style={{ fontSize: 12.5, color: "#4A5563" }}>
          {pendentes === 0 ? "Todos os documentos obrigatórios do check-list foram anexados." : `${pendentes} documento(s) obrigatório(s) pendente(s).`}
        </div>
        <div style={{ display: "flex", gap: 9 }}>
          <a
            href="/nova"
            style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#E01B22", borderRadius: 4, padding: "10px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
          >
            Voltar
          </a>
          {pendentes === 0 && (
            <a
              href={`/nova?rascunho=${rascunho.id}&passo=3`}
              style={{ border: "1px solid #E01B22", background: "#E01B22", color: "#fff", borderRadius: 4, padding: "10px 18px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
            >
              Continuar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

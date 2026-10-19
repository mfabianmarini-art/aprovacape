"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { enviarAlvaraAction } from "@/lib/actions/requerimento-actions";
import { enviarVarios, mensagemDeFalhaNoEnvio, ProblemaNoArquivo } from "@/lib/upload-cliente";

type Escolha = { alvara: File | null; art: File | null };

function SeletorPdf({
  id,
  rotulo,
  ajuda,
  arquivo,
  onEscolher,
  numero,
}: {
  id: string;
  rotulo: string;
  ajuda: string;
  arquivo: File | null;
  onEscolher: (f: File | null) => void;
  numero: number;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "26px 1fr", gap: 10, alignItems: "start" }}>
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontWeight: 700,
          background: arquivo ? "#24603A" : "#E01B22",
          color: "#fff",
        }}
      >
        {arquivo ? "✓" : numero}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#231F20" }}>{rotulo}</span>
        <span style={{ fontSize: 11.5, color: "#7A7472", lineHeight: 1.4 }}>{ajuda}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input id={id} type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => onEscolher(e.target.files?.[0] ?? null)} />
          <label
            htmlFor={id}
            style={{ border: "1px solid #E01B22", background: "#fff", color: "#E01B22", borderRadius: 4, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
          >
            {arquivo ? "Trocar arquivo" : "Escolher PDF"}
          </label>
          {arquivo && <span style={{ fontSize: 12, color: "#3B4653", fontFamily: "var(--font-mono)", overflowWrap: "anywhere" }}>{arquivo.name}</span>}
        </div>
      </div>
    </div>
  );
}

// Alvará da Prefeitura + ART/RRT de execução atual e válida: os dois são exigidos para a
// CAPE liberar o início da obra. Escolher não envia; o envio tranca a solicitação em
// conferência, então o RT confere os nomes antes de confirmar.
export function EnviarAlvara({ solicitacaoId, recusa }: { solicitacaoId: string; recusa: string | null }) {
  const [state, formAction, registrando] = useActionState(enviarAlvaraAction.bind(null, solicitacaoId), null as { error?: string } | null);
  const [escolha, setEscolha] = useState<Escolha>({ alvara: null, art: null });
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const enviando = useRef(false);
  const pending = registrando || progresso !== null;
  const completo = !!escolha.alvara && !!escolha.art;

  async function confirmar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!escolha.alvara || !escolha.art || pending || enviando.current) return;
    enviando.current = true;
    setErroEnvio(null);
    setProgresso(0);
    try {
      // Sobem direto ao Blob (a função da Vercel não aceita corpo > 4,5 MB) e só então a
      // action confere e registra os dois.
      const [alvara, art] = await enviarVarios([escolha.alvara, escolha.art], { destino: "alvara", solicitacaoId }, setProgresso);
      const fd = new FormData();
      fd.set("pathname", alvara.pathname);
      fd.set("nomeArquivo", alvara.nomeArquivo);
      fd.set("hash", alvara.hash);
      fd.set("artPathname", art.pathname);
      fd.set("artNomeArquivo", art.nomeArquivo);
      fd.set("artHash", art.hash);
      startTransition(() => formAction(fd));
    } catch (err) {
      setErroEnvio(err instanceof ProblemaNoArquivo ? err.message : mensagemDeFalhaNoEnvio(err));
    } finally {
      setProgresso(null);
      enviando.current = false;
    }
  }

  return (
    <form onSubmit={confirmar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {recusa && (
        <div style={{ fontSize: 12.5, color: "#8C2B22", background: "#FDF6F5", border: "1px solid #E8C9C4", borderRadius: 4, padding: "11px 13px", lineHeight: 1.45 }}>
          <strong>Envio anterior recusado pela CAPE:</strong> {recusa}
        </div>
      )}

      <SeletorPdf
        id={`alvara-${solicitacaoId}`}
        numero={1}
        rotulo="Alvará de execução"
        ajuda="Emitido pela Prefeitura para esta obra. PDF, até 5 MB."
        arquivo={escolha.alvara}
        onEscolher={(f) => setEscolha((s) => ({ ...s, alvara: f }))}
      />
      <SeletorPdf
        id={`art-${solicitacaoId}`}
        numero={2}
        rotulo="ART/RRT de execução"
        ajuda="Atual e válida, do responsável técnico pela execução desta obra. PDF, até 5 MB."
        arquivo={escolha.art}
        onEscolher={(f) => setEscolha((s) => ({ ...s, art: f }))}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", paddingLeft: 36 }}>
        <button
          type="submit"
          disabled={!completo || pending}
          style={{
            border: `1px solid ${completo ? "#E01B22" : "#DDD8CE"}`,
            background: completo ? "#E01B22" : "#EDE9E1",
            color: completo ? "#fff" : "#8B939C",
            borderRadius: 4,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 600,
            cursor: !completo ? "not-allowed" : pending ? "wait" : "pointer",
          }}
        >
          {progresso !== null ? `Enviando… ${progresso}%` : registrando ? "Conferindo…" : "Enviar para a CAPE"}
        </button>
        <span style={{ fontSize: 11.5, color: "#7A7472", lineHeight: 1.4 }}>
          {completo ? "Depois de enviar, a solicitação fica em conferência até a CAPE aceitar." : "Anexe os dois documentos para enviar."}
        </span>
      </div>

      {!pending && (erroEnvio ?? state?.error) && <div style={{ fontSize: 12, color: "#8C2B22", paddingLeft: 36 }}>{erroEnvio ?? state?.error}</div>}
    </form>
  );
}

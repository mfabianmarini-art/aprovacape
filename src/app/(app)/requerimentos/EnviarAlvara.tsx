"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { enviarAlvaraAction } from "@/lib/actions/requerimento-actions";
import { enviarVarios, mensagemDeFalhaNoEnvio, ProblemaNoArquivo } from "@/lib/upload-cliente";

type Escolha = { alvara: File | null; projeto: File | null; art: File | null };
type RtExecucao = { nome: string; registro: string; email: string };

const inputStyle: React.CSSProperties = { border: "1px solid #DDD8CE", borderRadius: 4, padding: "9px 11px", fontSize: 13, minWidth: 0 };
const CAMPOS_RT = [
  ["nome", "Nome", "text"],
  ["registro", "Registro CAU / CREA", "text"],
  ["email", "E-mail", "email"],
] as const;

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

// Alvará da Prefeitura, projeto carimbado e ART/RRT de execução atual e válida: os três são
// exigidos para a CAPE liberar o início da obra. Escolher não envia; o envio tranca a solicitação em
// conferência, então o RT confere os nomes antes de confirmar.
// rtExecucao: preenchido só quando o profissional da execução ficou para esta etapa (com o
// que foi informado num envio anterior recusado, se houver).
export function EnviarAlvara({ solicitacaoId, recusa, rtExecucao }: { solicitacaoId: string; recusa: string | null; rtExecucao: RtExecucao | null }) {
  const [state, formAction, registrando] = useActionState(enviarAlvaraAction.bind(null, solicitacaoId), null as { error?: string } | null);
  const [escolha, setEscolha] = useState<Escolha>({ alvara: null, projeto: null, art: null });
  const [rt, setRt] = useState<RtExecucao>(rtExecucao ?? { nome: "", registro: "", email: "" });
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const enviando = useRef(false);
  const pending = registrando || progresso !== null;
  const rtCompleto = !rtExecucao || (!!rt.nome.trim() && !!rt.registro.trim() && !!rt.email.trim());
  const completo = !!escolha.alvara && !!escolha.projeto && !!escolha.art && rtCompleto;

  async function confirmar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!escolha.alvara || !escolha.projeto || !escolha.art || !rtCompleto || pending || enviando.current) return;
    enviando.current = true;
    setErroEnvio(null);
    setProgresso(0);
    try {
      // Sobem direto ao Blob (a função da Vercel não aceita corpo > 4,5 MB) e só então a
      // action confere e registra os três.
      const [alvara, projeto, art] = await enviarVarios([escolha.alvara, escolha.projeto, escolha.art], { destino: "alvara", solicitacaoId }, setProgresso);
      const fd = new FormData();
      if (rtExecucao) {
        fd.set("rtExecNome", rt.nome);
        fd.set("rtExecRegistro", rt.registro);
        fd.set("rtExecEmail", rt.email);
      }
      fd.set("pathname", alvara.pathname);
      fd.set("nomeArquivo", alvara.nomeArquivo);
      fd.set("hash", alvara.hash);
      fd.set("projetoPathname", projeto.pathname);
      fd.set("projetoNomeArquivo", projeto.nomeArquivo);
      fd.set("projetoHash", projeto.hash);
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

      {rtExecucao && (
        <fieldset style={{ border: "1px solid #EDE9E1", borderRadius: 4, padding: "12px 14px", margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <legend style={{ fontSize: 13, fontWeight: 600, color: "#231F20", padding: "0 6px" }}>Responsável técnico pela execução</legend>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
            {CAMPOS_RT.map(([campo, rotulo, tipo]) => (
              <label key={campo} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, color: "#7A7472" }}>
                {rotulo}
                <input type={tipo} required value={rt[campo]} onChange={(e) => setRt((r) => ({ ...r, [campo]: e.target.value }))} style={inputStyle} />
              </label>
            ))}
          </div>
        </fieldset>
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
        id={`projeto-${solicitacaoId}`}
        numero={2}
        rotulo="Projeto carimbado pela Prefeitura"
        ajuda="Projeto aprovado, com o carimbo da Prefeitura. PDF, até 5 MB."
        arquivo={escolha.projeto}
        onEscolher={(f) => setEscolha((s) => ({ ...s, projeto: f }))}
      />
      <SeletorPdf
        id={`art-${solicitacaoId}`}
        numero={3}
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
          {completo
            ? "Depois de enviar, a solicitação fica em conferência até a CAPE aceitar."
            : rtExecucao
              ? "Informe o responsável pela execução e anexe os três documentos para enviar."
              : "Anexe os três documentos para enviar."}
        </span>
      </div>

      {!pending && (erroEnvio ?? state?.error) && <div style={{ fontSize: 12, color: "#8C2B22", paddingLeft: 36 }}>{erroEnvio ?? state?.error}</div>}
    </form>
  );
}

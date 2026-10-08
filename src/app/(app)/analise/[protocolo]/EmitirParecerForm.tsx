"use client";

import { useActionState, useState, useTransition } from "react";
import { emitirParecerAction, type ParecerState } from "@/lib/actions/analise-actions";
import { enviarDireto, mensagemDeFalhaNoEnvio, prepararEnvio } from "@/lib/upload-cliente";

const labelTextStyle: React.CSSProperties = { fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#7A7472" };

export function EmitirParecerForm({
  solicitacaoId,
  podeEmitir,
  mostrarDevolutiva,
  rotulo,
  bg,
  fg,
}: {
  solicitacaoId: string;
  podeEmitir: boolean;
  mostrarDevolutiva: boolean;
  rotulo: string;
  bg: string;
  fg: string;
}) {
  const [state, formAction, emitindo] = useActionState<ParecerState, FormData>(emitirParecerAction.bind(null, solicitacaoId), null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const pending = emitindo || progresso !== null;

  // O arquivo sobe direto ao Blob antes da action (o corpo de uma requisição à função da
  // Vercel não passa de 4,5 MB); a action recebe só o caminho e confere o arquivo.
  async function emitir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!podeEmitir || pending) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const arquivo = fd.get("arquivo");
    fd.delete("arquivo");
    setErroEnvio(null);
    if (arquivo instanceof File && arquivo.size > 0) {
      const destino = { destino: "devolutiva", solicitacaoId } as const;
      const prep = await prepararEnvio(arquivo, destino);
      if (prep.problema) return setErroEnvio(prep.problema);
      setProgresso(0);
      try {
        const arq = await enviarDireto(prep, destino, setProgresso);
        fd.set("pathname", arq.pathname);
        fd.set("nomeArquivo", arq.nomeArquivo);
        fd.set("hash", arq.hash);
      } catch (err) {
        setProgresso(null);
        return setErroEnvio(mensagemDeFalhaNoEnvio(err));
      }
      setProgresso(null);
    }
    startTransition(() => formAction(fd));
  }

  const erro = erroEnvio ?? state?.error;

  return (
    <form onSubmit={emitir} style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
      {mostrarDevolutiva && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, background: "#FAF9F6", border: "1px solid #EDE9E1", borderRadius: 4, padding: "13px 14px" }}>
          <div style={{ gridColumn: "1/-1", fontSize: 12, color: "#4A5563", lineHeight: 1.45 }}>
            Opcional — enviado ao responsável técnico junto com o parecer.
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={labelTextStyle}>Comentários gerais ao RT (opcional)</span>
            <textarea
              name="comentario"
              rows={3}
              maxLength={2000}
              placeholder="Observações gerais sobre o projeto, além das apontadas item a item."
              style={{ border: "1px solid #DDD8CE", borderRadius: 4, padding: "8px 10px", fontSize: 12.5, fontFamily: "inherit", lineHeight: 1.45, resize: "vertical" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={labelTextStyle}>Arquivo com os apontamentos (opcional)</span>
            <input name="arquivo" type="file" accept=".dwg,.zip,.pdf" style={{ border: "1px solid #DDD8CE", borderRadius: 4, padding: "7px 8px", fontSize: 12, background: "#fff" }} />
            <span style={{ fontSize: 11, color: "#7A7472" }}>DWG com os motivos da reprovação marcados — vários DWG num .zip. PDF também. Até 15 MB.</span>
          </label>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {erro && !pending && <span style={{ fontSize: 12, color: "#8C2B22" }}>{erro}</span>}
        <button
          type="submit"
          disabled={!podeEmitir || pending}
          style={{
            border: "1px solid #E01B22",
            background: bg,
            color: fg,
            borderRadius: 4,
            padding: "10px 16px",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: podeEmitir ? (pending ? "wait" : "pointer") : "not-allowed",
          }}
        >
          {progresso !== null ? `Enviando arquivo… ${progresso}%` : emitindo ? "Emitindo…" : rotulo}
        </button>
      </div>
    </form>
  );
}

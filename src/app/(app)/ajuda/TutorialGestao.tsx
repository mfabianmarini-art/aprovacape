"use client";

import { useActionState } from "react";
import { publicarTutorialAction, removerTutorialAction, type TutorialState } from "@/lib/actions/tutorial-actions";
import { useFormularioComArquivo } from "@/components/useFormularioComArquivo";

type Atual = { nome: string; tamanho: number; createdAt: Date } | null;

// Só para a equipe CAPE: publica, troca ou remove o vídeo e a legenda que os RTs veem
// acima. O arquivo vai direto do navegador ao armazenamento da plataforma.
export function TutorialGestao({ video, legenda }: { video: Atual; legenda: Atual }) {
  return (
    <div style={{ background: "#FAF9F6", border: "1px dashed #CFC8C6", borderRadius: 4, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" }}>Gestão do vídeo · visível só para a equipe CAPE</div>
      <Linha tipo="video" titulo="Vídeo" formatos="MP4, até 300 MB" accept="video/mp4,.mp4" atual={video} />
      <Linha tipo="legenda" titulo="Legenda" formatos="SRT ou VTT (opcional)" accept=".srt,.vtt" atual={legenda} />
    </div>
  );
}

function Linha({ tipo, titulo, formatos, accept, atual }: { tipo: "video" | "legenda"; titulo: string; formatos: string; accept: string; atual: Atual }) {
  const [state, formAction, salvando] = useActionState<TutorialState, FormData>(publicarTutorialAction.bind(null, tipo), null);
  const [remocao, removerAction, removendo] = useActionState<TutorialState>(() => removerTutorialAction(tipo), null);
  const envio = useFormularioComArquivo(formAction, { destino: "tutorial", tipo });
  const ocupado = salvando || envio.enviando || removendo;
  const erro = envio.erroEnvio ?? state?.error ?? remocao?.error;
  const ok = !ocupado && !erro ? (state?.ok ?? remocao?.ok) : undefined;
  const idInput = `tutorial-${tipo}`;
  const botao: React.CSSProperties = { border: "1px solid #DDD8CE", background: "#fff", borderRadius: 4, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: ocupado ? "wait" : "pointer" };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px", borderTop: "1px solid #EDE9E1", paddingTop: 10 }}>
      <div style={{ flex: "1 1 220px", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#231F20" }}>
          {titulo} <span style={{ fontWeight: 400, color: "#7A7472", fontSize: 12 }}>· {formatos}</span>
        </span>
        <span style={{ fontSize: 12, color: atual ? "#3B4653" : "#8B939C", overflowWrap: "anywhere" }}>
          {atual
            ? `${atual.nome} · ${(atual.tamanho / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB · enviado em ${new Date(atual.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
            : "nenhum arquivo publicado"}
        </span>
        {erro && !ocupado && <span style={{ fontSize: 12, color: "#8C2B22" }}>{erro}</span>}
        {ok && <span style={{ fontSize: 12, color: "#24603A" }}>{ok}</span>}
      </div>
      <form onSubmit={envio.onSubmit}>
        <input type="file" name="arquivo" accept={accept} id={idInput} style={{ display: "none" }} disabled={ocupado} onChange={(e) => e.currentTarget.form?.requestSubmit()} />
        <label htmlFor={idInput} style={{ ...botao, display: "inline-block", color: "#E01B22" }}>
          {envio.progresso !== null ? `Enviando… ${envio.progresso}%` : salvando ? "Conferindo…" : atual ? "Trocar" : "Enviar"}
        </label>
      </form>
      {atual && (
        <form action={removerAction}>
          <button
            type="submit"
            disabled={ocupado}
            onClick={(e) => {
              if (!confirm(`Remover ${tipo === "video" ? "o vídeo" : "a legenda"}? Os RTs deixam de vê-${tipo === "video" ? "lo" : "la"}.`)) e.preventDefault();
            }}
            style={{ ...botao, color: "#4A5563" }}
          >
            {removendo ? "Removendo…" : "Remover"}
          </button>
        </form>
      )}
    </div>
  );
}

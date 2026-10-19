"use client";

import { useActionState, useState, useTransition } from "react";
import { enviarVarios, mensagemDeFalhaNoEnvio, ProblemaNoArquivo } from "@/lib/upload-cliente";
import { registrarIrregularidadeAction, type IrregularidadeState } from "@/lib/actions/analise-actions";
import { IRREGULARIDADE_LABEL } from "@/lib/status";

const MAX_EVIDENCIAS = 8;

const botaoEvidencia = (principal: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "1px solid #8C2B22",
  background: principal ? "#8C2B22" : "#fff",
  color: principal ? "#fff" : "#8C2B22",
  borderRadius: 4,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
});

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
  color: "#7A7472",
};

// Formulário sempre aberto: quem controla a abertura é a linha da obra, em Obras em
// andamento, que o exibe num painel ocupando a largura toda.
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
  // Fotos tiradas na hora e arquivos escolhidos se acumulam aqui (o input de câmera traz
  // uma foto por vez). A prévia usa uma URL local, sem enviar nada antes do registro.
  const [evidencias, setEvidencias] = useState<{ id: string; file: File; previa: string | null }[]>([]);
  // Registrou com sucesso: limpa a lista e remonta o formulário (ajuste de estado na
  // renderização, quando a resposta da action muda).
  const [ultimoEstado, setUltimoEstado] = useState(state);
  const [rodada, setRodada] = useState(0);
  if (state !== ultimoEstado) {
    setUltimoEstado(state);
    if (state?.ok) {
      setEvidencias([]);
      setRodada((n) => n + 1);
    }
  }
  function adicionar(lista: FileList | null) {
    const novos = Array.from(lista ?? []).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previa: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setEvidencias((atual) => [...atual, ...novos].slice(0, MAX_EVIDENCIAS));
    if (evidencias.length + novos.length > MAX_EVIDENCIAS) setErroEnvio(`No máximo ${MAX_EVIDENCIAS} evidências por registro.`);
  }
  function remover(id: string) {
    setEvidencias((atual) => {
      const ev = atual.find((e) => e.id === id);
      if (ev?.previa) URL.revokeObjectURL(ev.previa);
      return atual.filter((e) => e.id !== id);
    });
  }
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const ocupado = pending || progresso !== null;

  // As evidências sobem direto ao Blob (fotos reduzidas no navegador) antes da action, que
  // recebe só os caminhos — o corpo de uma requisição à Vercel não passa de 4,5 MB.
  async function registrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ocupado) return;
    const fd = new FormData(e.currentTarget);
    fd.delete("foto");
    fd.delete("arquivos");
    const files = evidencias.map((ev) => ev.file);
    setErroEnvio(null);
    if (files.length > 0) {
      setProgresso(0);
      try {
        const enviados = await enviarVarios(files, { destino: "evidencia", solicitacaoId }, setProgresso);
        for (const a of enviados) {
          fd.append("pathname", a.pathname);
          fd.append("nomeArquivo", a.nomeArquivo);
          fd.append("hash", a.hash);
        }
      } catch (err) {
        setProgresso(null);
        return setErroEnvio(err instanceof ProblemaNoArquivo ? err.message : mensagemDeFalhaNoEnvio(err));
      }
      setProgresso(null);
    }
    startTransition(() => formAction(fd));
  }

  return (
    <form
      onSubmit={registrar}
      key={rodada}
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

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={labelStyle}>Evidências — até {MAX_EVIDENCIAS}; as fotos são comprimidas antes do envio</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* capture abre direto a câmera traseira no celular; no computador, o seletor. */}
          <input id={`foto-${solicitacaoId}`} name="foto" type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { adicionar(e.target.files); e.target.value = ""; }} />
          <label htmlFor={`foto-${solicitacaoId}`} style={botaoEvidencia(true)}>
            📷 Tirar foto
          </label>
          <input id={`arq-${solicitacaoId}`} name="arquivos" type="file" multiple accept="image/png,image/jpeg,image/webp,.pdf" style={{ display: "none" }} onChange={(e) => { adicionar(e.target.files); e.target.value = ""; }} />
          <label htmlFor={`arq-${solicitacaoId}`} style={botaoEvidencia(false)}>
            ⬆ Escolher fotos ou PDF
          </label>
        </div>
        {evidencias.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 }}>
            {evidencias.map((ev) => (
              <div key={ev.id} style={{ position: "relative", border: "1px solid #E8C9C4", borderRadius: 4, background: "#fff", overflow: "hidden" }}>
                {ev.previa ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ev.previa} alt={ev.file.name} style={{ width: "100%", height: 80, objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ height: 80, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, color: "#8C2B22" }}>PDF</div>
                )}
                <div style={{ fontSize: 10.5, padding: "3px 5px", color: "#4A5563", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.file.name}</div>
                <button
                  type="button"
                  onClick={() => remover(ev.id)}
                  aria-label={`Remover ${ev.file.name}`}
                  style={{ position: "absolute", top: 3, right: 3, width: 22, height: 22, borderRadius: "50%", border: 0, background: "rgba(35,31,32,.75)", color: "#fff", fontSize: 13, lineHeight: "22px", cursor: "pointer", padding: 0 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {(erroEnvio ?? state?.error) && !ocupado && <div style={{ fontSize: 12, color: "#8C2B22" }}>{erroEnvio ?? state?.error}</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={ocupado}
          style={{ border: "1px solid #8C2B22", background: "#8C2B22", color: "#fff", borderRadius: 4, padding: "9px 15px", fontSize: 12.5, fontWeight: 600, cursor: ocupado ? "wait" : "pointer" }}
        >
          {progresso !== null ? `Enviando evidências… ${progresso}%` : pending ? "Registrando…" : "Registrar e notificar"}
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

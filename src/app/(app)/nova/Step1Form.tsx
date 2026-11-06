"use client";

import { useActionState, useState } from "react";
import { criarRascunhoAction } from "@/lib/actions/nova-actions";
import { TIPO_LABEL } from "@/lib/status";

type Lote = {
  id: string;
  numero: string;
  empreendimentoId: string;
  quadra: { nome: string };
  empreendimento: { nome: string };
};

type Quadra = { id: string; nome: string; empreendimentoId: string; lotes: { id: string; numero: string }[] };

const inputStyle: React.CSSProperties = { border: "1px solid #DDD8CE", borderRadius: 4, padding: "10px 11px", fontSize: 13.5 };
const labelTextStyle: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" };

export function Step1Form({
  lotes,
  emailsSugeridos,
  quadras,
}: {
  lotes: Lote[];
  emailsSugeridos: Record<string, string>;
  quadras: Quadra[];
}) {
  const [state, formAction, pending] = useActionState(criarRascunhoAction, null as { error?: string } | null);
  const [loteId, setLoteId] = useState(lotes[0]?.id ?? "");
  const [maisDeUmLote, setMaisDeUmLote] = useState(false);
  const [adicionais, setAdicionais] = useState<string[]>([]);

  if (lotes.length === 0) {
    return (
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "#7A7472" }}>
        <span>Nenhum lote vinculado à sua conta ainda. A CAPE precisa confirmar seu vínculo antes de abrir uma solicitação.</span>
        <a href="/vinculo" style={{ alignSelf: "flex-start", fontWeight: 600 }}>
          Solicitar vínculo com um lote →
        </a>
      </div>
    );
  }

  // Só os do empreendimento do lote principal, sem ele mesmo: trocar o lote principal não
  // descarta o que foi indicado, mas o que deixou de caber não vai no envio.
  const principal = lotes.find((l) => l.id === loteId);
  const quadrasDoEmp = quadras.filter((q) => q.empreendimentoId === principal?.empreendimentoId);
  const rotulos = new Map(quadrasDoEmp.flatMap((q) => q.lotes.map((l) => [l.id, `${q.nome} L${l.numero}`] as const)));
  const indicados = adicionais.filter((id) => id !== loteId && rotulos.has(id));
  const meus = new Set(lotes.map((l) => l.id));

  return (
    <form action={formAction} style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Lote</span>
        <select name="loteId" required value={loteId} onChange={(e) => setLoteId(e.target.value)} style={{ ...inputStyle, background: "#fff" }}>
          {lotes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.empreendimento.nome} · {l.quadra.nome} L{l.numero}
            </option>
          ))}
        </select>
        <a href="/vinculo" style={{ fontSize: 11.5, fontWeight: 600 }}>
          Seu lote não está na lista? Solicitar vínculo com outro lote
        </a>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Tipo de solicitação</span>
        <select name="tipo" required style={{ ...inputStyle, background: "#fff" }}>
          {Object.entries(TIPO_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Área de intervenção (m²)</span>
        <input name="areaIntervencao" required type="number" step="0.01" min="0" style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
      </label>
      <div style={{ gridColumn: "1/-1", display: "flex", flexDirection: "column", gap: 10, border: "1px solid #EDE9E1", borderRadius: 4, padding: "12px 14px", background: "#FAF9F6" }}>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, cursor: "pointer" }}>
          <input
            type="checkbox"
            name="maisDeUmLote"
            checked={maisDeUmLote}
            onChange={(e) => setMaisDeUmLote(e.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span>O projeto abrange mais de um lote do mesmo proprietário</span>
        </label>
        {maisDeUmLote && (
          <>
            <span style={{ fontSize: 11.5, color: "#7A7472", lineHeight: 1.45 }}>
              Indique os outros lotes do projeto. Os que ainda não estão vinculados a você não impedem o envio: a CAPE confere
              a titularidade de cada um na análise e aprova ou recusa o vínculo. Junte no mesmo PDF a matrícula e a capa do
              IPTU de todos os lotes.
            </span>
            <SeletorLotes
              quadras={quadrasDoEmp}
              excluidos={new Set([loteId, ...indicados])}
              meus={meus}
              onAdicionar={(id) => setAdicionais((a) => [...a, id])}
            />
            {indicados.length > 0 && (
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {indicados.map((id) => (
                  <span
                    key={id}
                    style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "1px solid #DDD8CE", background: "#fff", borderRadius: 20, padding: "5px 6px 5px 12px", fontSize: 12.5, fontWeight: 600 }}
                  >
                    <input type="hidden" name="lotesAdicionais" value={id} />
                    {rotulos.get(id)}
                    <span style={{ fontSize: 11, fontWeight: 400, color: meus.has(id) ? "#24603A" : "#8A5210" }}>
                      {meus.has(id) ? "já vinculado" : "CAPE confere"}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remover ${rotulos.get(id)}`}
                      onClick={() => setAdicionais((a) => a.filter((x) => x !== id))}
                      style={{ border: 0, background: "none", color: "#7A7472", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 4px" }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1/-1" }}>
        <span style={labelTextStyle}>Descrição da obra</span>
        <textarea name="descricao" required rows={4} style={{ ...inputStyle, resize: "vertical" }} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1/-1", maxWidth: 460 }}>
        <span style={labelTextStyle}>E-mail do proprietário</span>
        {/* key: trocar de lote repõe a sugestão daquele lote */}
        <input key={loteId} name="proprietarioEmail" required type="email" defaultValue={emailsSugeridos[loteId] ?? ""} style={inputStyle} />
        <span style={{ fontSize: 11.5, color: "#7A7472", lineHeight: 1.45 }}>
          Quando a solicitação for protocolada, o proprietário recebe automaticamente neste e-mail o protocolo e a senha para
          acompanhar a aprovação — e você, uma cópia.
        </span>
      </label>

      {state?.error && <div style={{ gridColumn: "1/-1", fontSize: 12.5, color: "#8C2B22" }}>{state.error}</div>}

      <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, borderTop: "1px solid #EDE9E1", paddingTop: 16 }}>
        <button
          type="submit"
          disabled={pending}
          style={{ border: "1px solid #E01B22", background: "#E01B22", color: "#fff", borderRadius: 4, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {pending ? "Salvando…" : "Continuar"}
        </button>
      </div>
    </form>
  );
}

function SeletorLotes({
  quadras,
  excluidos,
  meus,
  onAdicionar,
}: {
  quadras: Quadra[];
  excluidos: Set<string>;
  meus: Set<string>;
  onAdicionar: (loteId: string) => void;
}) {
  const [quadraId, setQuadraId] = useState("");
  const [loteId, setLoteId] = useState("");
  const disponiveis = quadras.find((q) => q.id === quadraId)?.lotes.filter((l) => !excluidos.has(l.id)) ?? [];

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <select
        aria-label="Quadra do lote adicional"
        value={quadraId}
        onChange={(e) => {
          setQuadraId(e.target.value);
          setLoteId("");
        }}
        style={{ ...inputStyle, background: "#fff", flex: "1 1 140px" }}
      >
        <option value="">Quadra…</option>
        {quadras.map((q) => (
          <option key={q.id} value={q.id}>
            {q.nome}
          </option>
        ))}
      </select>
      <select
        aria-label="Lote adicional"
        value={loteId}
        disabled={!quadraId}
        onChange={(e) => setLoteId(e.target.value)}
        style={{ ...inputStyle, background: "#fff", flex: "1 1 140px" }}
      >
        <option value="">Lote…</option>
        {disponiveis.map((l) => (
          <option key={l.id} value={l.id}>
            L{l.numero}
            {meus.has(l.id) ? " (já vinculado a você)" : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!loteId}
        onClick={() => {
          onAdicionar(loteId);
          setLoteId("");
        }}
        style={{
          border: "1px solid #DDD8CE",
          background: "#fff",
          color: loteId ? "#E01B22" : "#B0AAA0",
          borderRadius: 4,
          padding: "10px 14px",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: loteId ? "pointer" : "not-allowed",
        }}
      >
        Adicionar lote
      </button>
    </div>
  );
}

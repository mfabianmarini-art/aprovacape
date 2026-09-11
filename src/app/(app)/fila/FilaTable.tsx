"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_INFO } from "@/lib/status";
import { prazoTexto } from "@/lib/prazo";
import type { getFila } from "@/lib/queries/fila";

type Fila = Awaited<ReturnType<typeof getFila>>;

const FILTROS = [
  "Todas",
  "Em análise",
  "Em análise técnica",
  "Aguardando complementação",
  "Alvará em conferência",
  "Reprovada",
] as const;

export function FilaTable({ fila }: { fila: Fila }) {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("Todas");
  const [empreendimentoFiltro, setEmpreendimentoFiltro] = useState("Todos");
  const router = useRouter();

  const empreendimentos = Array.from(new Set(fila.map((s) => s.lote.empreendimento.nome))).sort();

  const linhas = fila.filter(
    (s) =>
      (filtro === "Todas" || STATUS_INFO[s.status].label === filtro) &&
      (empreendimentoFiltro === "Todos" || s.lote.empreendimento.nome === empreendimentoFiltro),
  );

  return (
    <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, overflow: "hidden" }}>
      {empreendimentos.length > 1 && (
        <div style={{ display: "flex", gap: 8, padding: "13px 18px", borderBottom: "1px solid #EDE9E1", flexWrap: "wrap" }}>
          {["Todos", ...empreendimentos].map((e) => (
            <button
              key={e}
              onClick={() => setEmpreendimentoFiltro(e)}
              style={{
                border: `1px solid ${empreendimentoFiltro === e ? "#B4711A" : "#DDD8CE"}`,
                background: empreendimentoFiltro === e ? "#B4711A" : "#FFFFFF",
                color: empreendimentoFiltro === e ? "#FFFFFF" : "#4A5563",
                borderRadius: 20,
                padding: "6px 13px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, padding: "13px 18px", borderBottom: "1px solid #EDE9E1", flexWrap: "wrap" }}>
        {FILTROS.map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              border: `1px solid ${filtro === f ? "#12455E" : "#DDD8CE"}`,
              background: filtro === f ? "#12455E" : "#FFFFFF",
              color: filtro === f ? "#FFFFFF" : "#4A5563",
              borderRadius: 20,
              padding: "6px 13px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {f}
          </button>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px 150px 1fr 190px 150px 128px 96px",
          padding: "10px 18px",
          background: "#FAF9F6",
          borderBottom: "1px solid #EDE9E1",
          fontSize: 10.5,
          letterSpacing: ".13em",
          textTransform: "uppercase",
          color: "#6B7480",
        }}
      >
        <div>Protocolo</div>
        <div>Empreendimento</div>
        <div>Lote / obra</div>
        <div>Situação</div>
        <div>Prazo</div>
        <div>Reenvios</div>
        <div />
      </div>
      {linhas.length === 0 && (
        <div style={{ padding: 24, fontSize: 13, color: "#6B7480" }}>Nenhuma solicitação neste filtro.</div>
      )}
      {linhas.map((s) => {
        const info = STATUS_INFO[s.status];
        return (
          <div
            key={s.id}
            style={{
              display: "grid",
              gridTemplateColumns: "120px 150px 1fr 190px 150px 128px 96px",
              alignItems: "center",
              padding: "14px 18px",
              borderBottom: "1px solid #F1EEE7",
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{s.protocolo}</div>
            <div style={{ fontSize: 12, color: "#4A5563", paddingRight: 10 }}>{s.lote.empreendimento.nome}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingRight: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                {s.lote.quadra.nome} L{s.lote.numero}
              </div>
              <div style={{ fontSize: 11.5, color: "#6B7480" }}>
                {s.descricao.length > 40 ? s.descricao.slice(0, 40) + "…" : s.descricao} · RT {s.responsavelTecnicoNome}
              </div>
            </div>
            <div>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 9px",
                  borderRadius: 3,
                  fontSize: 11.5,
                  fontWeight: 600,
                  background: info.bg,
                  color: info.fg,
                }}
              >
                {info.label}
              </span>
            </div>
            <div style={{ fontSize: 12, color: s.status === "ANALISE" ? "#8C2B22" : "#4A5563", fontFamily: "var(--font-mono)" }}>
              {prazoTexto(s)}
            </div>
            <div style={{ fontSize: 12, color: "#4A5563", fontFamily: "var(--font-mono)" }}>
              {s.reenvios} / {s.lote.empreendimento.reenviosSemTaxa}
            </div>
            <div>
              <button
                onClick={() => router.push(`/analise/${s.protocolo}`)}
                style={{
                  border: "1px solid #12455E",
                  background: "#12455E",
                  color: "#fff",
                  borderRadius: 4,
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Analisar
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIPO_LABEL, IRREGULARIDADE_LABEL, formatDate } from "@/lib/status";
import { diasDesde } from "@/lib/prazo";
import type { getObrasEmAndamento } from "@/lib/queries/obras";

type Obras = Awaited<ReturnType<typeof getObrasEmAndamento>>;

const SITUACOES = ["Todas", "Com irregularidade em aberto", "Sem irregularidade"] as const;

const COLUNAS = "120px 150px 1fr 160px 1fr 120px";

export function ObrasTable({ obras }: { obras: Obras }) {
  const [situacao, setSituacao] = useState<(typeof SITUACOES)[number]>("Todas");
  const [empreendimentoFiltro, setEmpreendimentoFiltro] = useState("Todos");
  const router = useRouter();

  const empreendimentos = Array.from(new Set(obras.map((o) => o.lote.empreendimento.nome))).sort();

  const abertas = (o: Obras[number]) => o.irregularidades.filter((i) => !i.regularizadaEm);

  const linhas = obras.filter((o) => {
    const temAberta = abertas(o).length > 0;
    const casaSituacao =
      situacao === "Todas" ||
      (situacao === "Com irregularidade em aberto" ? temAberta : !temAberta);
    const casaEmpreendimento =
      empreendimentoFiltro === "Todos" || o.lote.empreendimento.nome === empreendimentoFiltro;
    return casaSituacao && casaEmpreendimento;
  });

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
        {SITUACOES.map((s) => (
          <button
            key={s}
            onClick={() => setSituacao(s)}
            style={{
              border: `1px solid ${situacao === s ? "#3B3486" : "#DDD8CE"}`,
              background: situacao === s ? "#3B3486" : "#FFFFFF",
              color: situacao === s ? "#FFFFFF" : "#4A5563",
              borderRadius: 20,
              padding: "6px 13px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: COLUNAS,
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
        <div>Início liberado</div>
        <div>Acompanhamento</div>
        <div />
      </div>
      {linhas.length === 0 && (
        <div style={{ padding: 24, fontSize: 13, color: "#6B7480" }}>
          {obras.length === 0
            ? "Nenhuma obra com início liberado. A obra entra aqui quando a CAPE aceita o alvará de execução."
            : "Nenhuma obra neste filtro."}
        </div>
      )}
      {linhas.map((o) => {
        const emAberto = abertas(o);
        const liberadaEm = o.historico[0]?.createdAt ?? null;
        return (
          <div
            key={o.id}
            style={{
              display: "grid",
              gridTemplateColumns: COLUNAS,
              alignItems: "center",
              padding: "14px 18px",
              borderBottom: "1px solid #F1EEE7",
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{o.protocolo}</div>
            <div style={{ fontSize: 12, color: "#4A5563", paddingRight: 10 }}>{o.lote.empreendimento.nome}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingRight: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                {o.lote.quadra.nome} L{o.lote.numero}
              </div>
              <div style={{ fontSize: 11.5, color: "#6B7480" }}>
                {TIPO_LABEL[o.tipo]} · {o.areaConstruida} m² · RT {o.responsavelTecnicoNome}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#4A5563", fontFamily: "var(--font-mono)", paddingRight: 12 }}>
              {liberadaEm ? (
                <>
                  {formatDate(liberadaEm)}
                  <div style={{ fontSize: 11, color: "#6B7480" }}>há {diasDesde(liberadaEm)}d</div>
                </>
              ) : (
                // Obras liberadas antes da conferência de alvará não têm o evento.
                <span style={{ color: "#6B7480" }}>não registrado</span>
              )}
            </div>
            <div style={{ paddingRight: 16 }}>
              {emAberto.length === 0 ? (
                <span style={{ fontSize: 12, color: "#24603A" }}>Sem irregularidade em aberto</span>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#8C2B22" }}>
                    {emAberto.length} irregularidade{emAberto.length > 1 ? "s" : ""} em aberto
                  </span>
                  <span style={{ fontSize: 11.5, color: "#6B7480" }}>
                    {IRREGULARIDADE_LABEL[emAberto[0]!.tipo]}
                    {emAberto.length > 1 && ` e mais ${emAberto.length - 1}`}
                  </span>
                </div>
              )}
            </div>
            <div>
              <button
                onClick={() => router.push(`/analise/${o.protocolo}`)}
                style={{
                  border: "1px solid #3B3486",
                  background: "#3B3486",
                  color: "#fff",
                  borderRadius: 4,
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Acompanhar
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

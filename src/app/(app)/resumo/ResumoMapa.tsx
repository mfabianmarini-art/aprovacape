"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/status";
import type { getResumoData } from "@/lib/queries/resumo";

type Data = NonNullable<Awaited<ReturnType<typeof getResumoData>>>;

export function ResumoMapa({ data, podeAnalisar }: { data: Data; podeAnalisar: boolean }) {
  const [loteSel, setLoteSel] = useState<string | null>(null);
  const router = useRouter();
  const lote = data.lotes.find((l) => l.id === loteSel) ?? null;
  const ATIVOS = ["ENVIADA", "ANALISE", "COMPLEMENTO"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(158px,1fr))", gap: 14 }}>
        {data.indicadores.map((k) => (
          <div
            key={k.rotulo}
            style={{
              background: "#fff",
              border: "1px solid #DDD8CE",
              borderTop: `3px solid ${k.cor}`,
              borderRadius: 4,
              padding: "15px 16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 27, fontWeight: 600, lineHeight: 1 }}>
              {k.valor}
            </div>
            <div style={{ fontSize: 11.5, color: "#4A5563", lineHeight: 1.35 }}>{k.rotulo}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.55fr) minmax(0,1fr)", gap: 20, alignItems: "start" }}>
        <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "14px 18px",
              borderBottom: "1px solid #EDE9E1",
            }}
          >
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
                Planta do loteamento
              </div>
              <div style={{ fontSize: 11.5, color: "#6B7480" }}>
                {data.empreendimento.nome} · {data.empreendimento.cidade}/{data.empreendimento.uf} · {data.empreendimento.numQuadras} quadras · {data.lotes.length} lotes
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#6B7480", fontFamily: "var(--font-mono)" }}>clique num lote →</div>
          </div>
          <div style={{ position: "relative", padding: 16, background: "#F4F2ED" }}>
            <div style={{ position: "relative", width: "100%", aspectRatio: "1200/669" }}>
              {data.empreendimento.plantaImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.empreendimento.plantaImageUrl}
                  alt="Planta do loteamento"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "grid",
                    placeItems: "center",
                    border: "1px dashed #C9C2B4",
                    borderRadius: 4,
                    color: "#8B939C",
                    fontSize: 12.5,
                    textAlign: "center",
                    padding: 24,
                  }}
                >
                  Planta do loteamento ainda não cadastrada.
                </div>
              )}
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                {data.lotes
                  .filter((l) => l.posX != null && l.posY != null)
                  .map((l) => {
                    const ativo = loteSel === l.id;
                    const bg = l.statusInfo.bg;
                    const fillOpaque = bg === "#0E1B24" ? "rgba(14,27,36,.82)" : bg;
                    return (
                      <button
                        key={l.id}
                        onClick={() => setLoteSel(ativo ? null : l.id)}
                        title={`${l.quadra.nome} L${l.numero} · ${l.statusInfo.label}`}
                        style={{
                          position: "absolute",
                          left: `${l.posX}%`,
                          top: `${l.posY}%`,
                          transform: "translate(-50%,-50%)",
                          pointerEvents: "auto",
                          cursor: "pointer",
                          width: "2.2%",
                          height: "2.6%",
                          minWidth: 12,
                          minHeight: 10,
                          padding: 0,
                          display: "grid",
                          placeItems: "center",
                          borderRadius: 2,
                          background: fillOpaque,
                          border: ativo ? "2px solid #0E1B24" : "1px solid rgba(14,27,36,.35)",
                          boxShadow: ativo ? "0 0 0 3px rgba(180,113,26,.55)" : "0 1px 3px rgba(14,27,36,.28)",
                          color: l.statusInfo.fg,
                          fontFamily: "var(--font-mono)",
                          fontSize: 8,
                          fontWeight: 600,
                          lineHeight: 1,
                        }}
                      >
                        {l.numero}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, padding: "13px 18px", borderTop: "1px solid #EDE9E1" }}>
            {data.legenda.map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "#4A5563" }}>
                <span style={{ width: 11, height: 11, borderRadius: 2, background: l.cor }} />
                {l.label}
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {lote && (
            <section
              style={{
                background: "#fff",
                border: "1px solid #12455E",
                borderRadius: 4,
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 2px 10px rgba(14,27,36,.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "15px 18px",
                  background: "#0B2E3F",
                  color: "#fff",
                  borderRadius: "3px 3px 0 0",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, letterSpacing: ".03em", lineHeight: 1 }}>
                    Quadra {lote.quadra.nome} · Lote {lote.numero}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#8FB0BF" }}>{lote.rua}</div>
                </div>
                <button
                  onClick={() => setLoteSel(null)}
                  style={{
                    border: "1px solid rgba(255,255,255,.3)",
                    background: "transparent",
                    color: "#fff",
                    borderRadius: 4,
                    width: 26,
                    height: 26,
                    fontSize: 14,
                    cursor: "pointer",
                    flex: "none",
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12, borderBottom: "1px solid #EDE9E1" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 9px",
                      borderRadius: 3,
                      fontSize: 11.5,
                      fontWeight: 600,
                      background: lote.statusInfo.bg,
                      color: lote.statusInfo.fg,
                    }}
                  >
                    {lote.statusInfo.label}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#6B7480" }}>{lote.areaM2.toLocaleString("pt-BR")} m²</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    ["Proprietário", lote.proprietario?.name ?? "—"],
                    ["Resp. técnico", lote.rt?.name ?? "—"],
                    ["Solicitações", `${new Set(lote.solicitacoes.map((s) => s.protocolo)).size} protocolo(s)`],
                    ["Última movimentação", lote.historico[0]?.texto ?? "Sem movimentações"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <div style={{ fontSize: 10, letterSpacing: ".13em", textTransform: "uppercase", color: "#6B7480" }}>{k}</div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.35 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 11 }}>
                <div style={{ fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#6B7480" }}>
                  Histórico de solicitações
                </div>
                {lote.historico.length === 0 && (
                  <div style={{ fontSize: 12.5, color: "#6B7480" }}>Nenhuma solicitação registrada para este lote.</div>
                )}
                {lote.historico.map((h, i) => (
                  <div key={h.id} style={{ display: "grid", gridTemplateColumns: "12px 1fr", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: h.cor, marginTop: 4, flex: "none" }} />
                      {i < lote.historico.length - 1 && <span style={{ flex: 1, width: 1, background: "#E4DFD5" }} />}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 11 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 600 }}>{h.protocolo}</span>
                        <span style={{ fontSize: 11, color: "#6B7480", fontFamily: "var(--font-mono)" }}>{formatDate(h.createdAt)}</span>
                      </div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "#3B4653" }}>{h.texto}</div>
                    </div>
                  </div>
                ))}
                {podeAnalisar && lote.statusAtual && ATIVOS.includes(lote.statusAtual.status) && (
                  <button
                    onClick={() => router.push(`/analise/${lote.statusAtual!.protocolo}`)}
                    style={{
                      border: "1px solid #12455E",
                      background: "#12455E",
                      color: "#fff",
                      borderRadius: 4,
                      padding: "10px 14px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Abrir análise de {lote.statusAtual.protocolo}
                  </button>
                )}
              </div>
            </section>
          )}

          <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid #EDE9E1",
                fontFamily: "var(--font-display)",
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: ".04em",
                textTransform: "uppercase",
              }}
            >
              Situação por quadra
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {data.quadras.map((q) => (
                <div key={q.nome} style={{ padding: "13px 18px", borderBottom: "1px solid #F1EEE7", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{q.nome}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#6B7480" }}>{q.resumo}</div>
                  </div>
                  <div style={{ display: "flex", height: 7, borderRadius: 4, overflow: "hidden", background: "#EDE9E1" }}>
                    {q.barras.map((b, i) => (
                      <div key={i} style={{ width: b.w, background: b.cor }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {data.prazosEmRisco.length > 0 && (
              <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "#6B7480" }}>Prazos em risco</div>
                {data.prazosEmRisco.map((p, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: p.cor, lineHeight: 1.45 }}>
                    {p.texto}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

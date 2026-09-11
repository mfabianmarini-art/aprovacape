"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, STATUS_INFO, TIPO_LABEL, DOC_LABEL } from "@/lib/status";
import type { getResumoData } from "@/lib/queries/resumo";

type Data = NonNullable<Awaited<ReturnType<typeof getResumoData>>>;

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 10, letterSpacing: ".13em", textTransform: "uppercase", color: "#6B7480" }}>{titulo}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>{children}</div>
    </div>
  );
}

// `bloco` ocupa a largura toda: serve para textos longos, como a descrição da obra.
function Campo({ k, v, bloco }: { k: string; v: string; bloco?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, gridColumn: bloco ? "1 / -1" : undefined }}>
      <span style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#8B939C" }}>{k}</span>
      <span style={{ fontSize: 12, lineHeight: 1.4, color: "#3B4653" }}>{v}</span>
    </div>
  );
}

export function ResumoMapa({ data, podeAnalisar }: { data: Data; podeAnalisar: boolean }) {
  const [loteSel, setLoteSel] = useState<string | null>(null);
  const [protocoloSel, setProtocoloSel] = useState<string | null>(null);
  const router = useRouter();
  const lote = data.lotes.find((l) => l.id === loteSel) ?? null;
  const ATIVOS = ["ENVIADA", "ANALISE", "COMPLEMENTO"];

  // Trocar de lote fecha o protocolo aberto: o histórico mostrado tem de ser sempre
  // o do lote em tela.
  function selecionarLote(id: string | null) {
    setLoteSel(id);
    setProtocoloSel(null);
  }

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
                        onClick={() => selecionarLote(ativo ? null : l.id)}
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
                  <div style={{ fontSize: 11.5, color: "#8FB0BF" }}>{lote.rua ?? "Endereço não informado"}</div>
                </div>
                <button
                  onClick={() => selecionarLote(null)}
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
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#6B7480" }}>
                    {lote.areaM2 != null ? `${lote.areaM2.toLocaleString("pt-BR")} m²` : "área não informada"}
                  </span>
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
                  Protocolos deste lote
                </div>
                {lote.solicitacoes.length === 0 && (
                  <div style={{ fontSize: 12.5, color: "#6B7480" }}>Nenhuma solicitação registrada para este lote.</div>
                )}
                {lote.solicitacoes.map((s) => {
                  const info = STATUS_INFO[s.status];
                  const aberto = protocoloSel === s.id;
                  return (
                    <div key={s.id} style={{ border: `1px solid ${aberto ? "#12455E" : "#EDE9E1"}`, borderRadius: 4, overflow: "hidden" }}>
                      <button
                        type="button"
                        onClick={() => setProtocoloSel(aberto ? null : s.id)}
                        style={{
                          width: "100%",
                          display: "grid",
                          gridTemplateColumns: "1fr 14px",
                          alignItems: "center",
                          gap: 10,
                          padding: "11px 13px",
                          border: 0,
                          background: aberto ? "#F7F5F0" : "#fff",
                          textAlign: "left",
                          cursor: "pointer",
                          font: "inherit",
                        }}
                      >
                        <span style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{s.protocolo}</span>
                            <span
                              style={{ display: "inline-block", padding: "3px 8px", borderRadius: 3, fontSize: 10.5, fontWeight: 600, background: info.bg, color: info.fg }}
                            >
                              {info.label}
                            </span>
                          </span>
                          <span style={{ fontSize: 11.5, color: "#6B7480" }}>
                            {TIPO_LABEL[s.tipo]} · aberta em {formatDate(s.createdAt)} · {s.historico.length} movimentação(ões)
                          </span>
                        </span>
                        <span style={{ color: "#6B7480", fontSize: 11 }}>{aberto ? "▾" : "▸"}</span>
                      </button>

                      {aberto && (
                        <div style={{ padding: "12px 13px 4px", borderTop: "1px solid #EDE9E1", background: "#FBFAF7" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 9, paddingBottom: 13 }}>
                            <Bloco titulo="Obra">
                              <Campo k="Tipo" v={TIPO_LABEL[s.tipo]} />
                              <Campo k="Área construída" v={`${s.areaConstruida.toLocaleString("pt-BR")} m²`} />
                              <Campo k="Área do lote" v={lote.areaM2 != null ? `${lote.areaM2.toLocaleString("pt-BR")} m²` : "—"} />
                              <Campo k="Endereço" v={lote.rua ?? "—"} />
                            </Bloco>

                            <Campo k="Descrição" v={s.descricao} bloco />

                            <Bloco titulo="Responsável técnico">
                              <Campo k="Nome" v={s.responsavelTecnicoNome || "—"} />
                              <Campo k="Registro" v={s.responsavelTecnicoRegistro || "—"} />
                              <Campo k="E-mail" v={s.responsavelTecnicoEmail || "—"} />
                              <Campo k="RT do lote" v={lote.rt?.name ?? "—"} />
                            </Bloco>

                            <Bloco titulo="Protocolo">
                              <Campo k="Aberta por" v={s.criadoPor?.name ?? "—"} />
                              <Campo k="Abertura" v={formatDate(s.createdAt)} />
                              <Campo k="Prazo de análise" v={`${s.prazoDias} dias`} />
                              {/* Pagamento é assunto entre CAPE e proprietário; o síndico
                                  acompanha o andamento, não a cobrança. */}
                              {podeAnalisar && <Campo k="Taxa" v={s.pago ? "paga" : "não paga"} />}
                              <Campo k="Reenvios" v={String(s.reenvios)} />
                              <Campo k="Proprietário" v={lote.proprietario?.name ?? "—"} />
                            </Bloco>

                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <div style={{ fontSize: 10, letterSpacing: ".13em", textTransform: "uppercase", color: "#6B7480" }}>
                                Documentos anexados
                              </div>
                              {s.documentos.length === 0 ? (
                                <div style={{ fontSize: 12, color: "#6B7480" }}>Nenhum documento anexado.</div>
                              ) : (
                                s.documentos.map((d) => (
                                  <div key={d.id} style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 11.5, fontWeight: 600 }}>{DOC_LABEL[d.tipo].nome}</span>
                                    <a
                                      href={`/api/files/${d.id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ fontSize: 11.5, color: "#12455E", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}
                                    >
                                      {d.nomeArquivo}
                                    </a>
                                    <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: d.validado ? "#24603A" : "#8A5210" }}>
                                      {d.validado ? "validado" : "a validar"}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>

                            <div style={{ fontSize: 10, letterSpacing: ".13em", textTransform: "uppercase", color: "#6B7480", paddingTop: 4 }}>
                              Histórico
                            </div>
                          </div>
                          {s.historico.length === 0 && (
                            <div style={{ fontSize: 12, color: "#6B7480", paddingBottom: 10 }}>
                              Sem movimentações registradas neste protocolo.
                            </div>
                          )}
                          {s.historico.map((h, i) => (
                            <div key={h.id} style={{ display: "grid", gridTemplateColumns: "12px 1fr", gap: 10 }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <span style={{ width: 9, height: 9, borderRadius: "50%", background: h.cor, marginTop: 4, flex: "none" }} />
                                {i < s.historico.length - 1 && <span style={{ flex: 1, width: 1, background: "#E4DFD5" }} />}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 11 }}>
                                <span style={{ fontSize: 11, color: "#6B7480", fontFamily: "var(--font-mono)" }}>
                                  {formatDate(h.createdAt)}
                                </span>
                                <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "#3B4653" }}>{h.texto}</div>
                              </div>
                            </div>
                          ))}
                          {podeAnalisar && (
                            <button
                              onClick={() => router.push(`/analise/${s.protocolo}`)}
                              style={{
                                border: "1px solid #DDD8CE",
                                background: "#fff",
                                color: "#12455E",
                                borderRadius: 4,
                                padding: "8px 12px",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                marginBottom: 10,
                              }}
                            >
                              Abrir análise deste protocolo
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatDateTime, STATUS_INFO, TIPO_LABEL, DOC_LABEL, IRREGULARIDADE_LABEL } from "@/lib/status";
import { ROLE_LABEL } from "@/lib/nav";
import type { getResumoData } from "@/lib/queries/resumo";

type Data = NonNullable<Awaited<ReturnType<typeof getResumoData>>>;

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 10, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" }}>{titulo}</div>
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

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("Todos");

  // Trocar de lote fecha o protocolo aberto: o histórico mostrado tem de ser sempre
  // o do lote em tela.
  function selecionarLote(id: string | null) {
    setLoteSel(id);
    setProtocoloSel(null);
  }

  const termo = busca.trim().toLowerCase();
  const statusDisponiveis = Array.from(new Set(data.lotes.map((l) => l.statusInfo.label))).sort();
  // Irregularidade não é um status de protocolo: convive com qualquer um deles, então
  // entra na mesma caixa como um recorte à parte, não como mais uma opção da lista.
  const IRREGULARES = "__irregulares";
  const nIrregulares = data.lotes.filter((l) => l.irregularidadesAbertas > 0).length;

  function combina(l: Data["lotes"][number]) {
    if (statusFiltro === IRREGULARES) {
      if (l.irregularidadesAbertas === 0) return false;
    } else if (statusFiltro !== "Todos" && l.statusInfo.label !== statusFiltro) return false;
    if (!termo) return true;
    return [
      l.numero,
      l.quadra.nome,
      `${l.quadra.nome} ${l.numero}`,
      `${l.quadra.nome}${l.numero}`,
      `${l.quadra.nome} L${l.numero}`,
      l.rua ?? "",
      l.proprietario?.name ?? "",
      l.rt?.name ?? "",
      ...l.solicitacoes.map((s) => s.protocolo),
    ].some((campo) => campo.toLowerCase().includes(termo));
  }

  const filtrados = data.lotes.filter(combina);
  const filtroAtivo = termo.length > 0 || statusFiltro !== "Todos";

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

      <div className="resumo-grid">
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
              <div style={{ fontSize: 11.5, color: "#7A7472" }}>
                {data.empreendimento.nome} · {data.empreendimento.cidade}/{data.empreendimento.uf} · {data.empreendimento.numQuadras} quadras · {data.lotes.length} lotes
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#7A7472", fontFamily: "var(--font-mono)" }}>clique num lote →</div>
          </div>

          <div style={{ display: "flex", gap: 9, padding: "12px 18px", borderBottom: "1px solid #EDE9E1", flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por quadra, lote, proprietário, RT, endereço ou protocolo"
              style={{ flex: 1, minWidth: 240, border: "1px solid #DDD8CE", borderRadius: 4, padding: "9px 11px", fontSize: 12.5 }}
            />
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              style={{ border: "1px solid #DDD8CE", borderRadius: 4, padding: "9px 11px", fontSize: 12.5, background: "#fff" }}
            >
              <option value="Todos">Todos os status</option>
              <option value={IRREGULARES} disabled={nIrregulares === 0}>
                {nIrregulares === 0
                  ? "Com irregularidade (nenhum)"
                  : `Com irregularidade (${nIrregulares})`}
              </option>
              <optgroup label="Status do protocolo">
                {statusDisponiveis.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </optgroup>
            </select>
            {filtroAtivo && (
              <>
                <span style={{ fontSize: 11.5, color: "#7A7472", fontFamily: "var(--font-mono)" }}>
                  {filtrados.length} de {data.lotes.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setBusca("");
                    setStatusFiltro("Todos");
                  }}
                  style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#4A5563", borderRadius: 4, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}
                >
                  Limpar
                </button>
              </>
            )}
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
                    const fillOpaque = bg === "#231F20" ? "rgba(35,31,32,.82)" : bg;
                    // Fora do filtro o pin apaga em vez de sumir: a planta continua
                    // legível como planta, e o que casa salta à vista.
                    const apagado = filtroAtivo && !combina(l);
                    const irregular = l.irregularidadesAbertas > 0;
                    return (
                      <button
                        key={l.id}
                        onClick={() => selecionarLote(ativo ? null : l.id)}
                        title={`${l.quadra.nome} L${l.numero} · ${l.statusInfo.label}${
                          irregular ? ` · ${l.irregularidadesAbertas} irregularidade(s) em aberto` : ""
                        }`}
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
                          opacity: apagado ? 0.22 : 1,
                          border: ativo ? "2px solid #231F20" : "1px solid rgba(35,31,32,.35)",
                          boxShadow: ativo
                            ? "0 0 0 3px rgba(180,113,26,.55)"
                            : filtroAtivo && !apagado
                              ? "0 0 0 2px rgba(180,113,26,.5)"
                              : "0 1px 3px rgba(35,31,32,.28)",
                          color: l.statusInfo.fg,
                          fontFamily: "var(--font-mono)",
                          fontSize: 8,
                          fontWeight: 600,
                          lineHeight: 1,
                        }}
                      >
                        {l.numero}
                        {/* A cor do pino já é o status; a irregularidade entra como marca
                            sobreposta para as duas informações caberem no mesmo pino. */}
                        {irregular && (
                          <span
                            style={{
                              position: "absolute",
                              top: -3,
                              right: -3,
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: "#8C2B22",
                              border: "1px solid #fff",
                              boxShadow: "0 0 0 1px rgba(140,43,34,.5)",
                            }}
                          />
                        )}
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
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "#4A5563" }}>
              <span style={{ position: "relative", width: 11, height: 11, borderRadius: 2, background: "#EDE9E1" }}>
                <span
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -3,
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#8C2B22",
                    border: "1px solid #fff",
                  }}
                />
              </span>
              Com irregularidade
            </div>
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {filtroAtivo && (
            <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #EDE9E1", fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#7A7472" }}>
                Resultados da busca
              </div>
              {filtrados.length === 0 && (
                <div style={{ padding: 18, fontSize: 12.5, color: "#7A7472" }}>Nenhum lote corresponde ao filtro.</div>
              )}
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {filtrados.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => selecionarLote(l.id)}
                    style={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 16px",
                      border: 0,
                      borderBottom: "1px solid #F1EEE7",
                      background: loteSel === l.id ? "#F7F5F0" : "#fff",
                      textAlign: "left",
                      cursor: "pointer",
                      font: "inherit",
                    }}
                  >
                    <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                        {l.quadra.nome} L{l.numero}
                        {l.posX == null && (
                          <span style={{ fontWeight: 400, color: "#8B939C" }}> · sem pino na planta</span>
                        )}
                      </span>
                      <span style={{ fontSize: 11, color: "#7A7472", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {l.proprietario?.name ?? "sem proprietário"}
                        {l.statusAtual ? ` · ${l.statusAtual.protocolo}` : ""}
                      </span>
                    </span>
                    <span style={{ flex: "none", display: "flex", alignItems: "center", gap: 6 }}>
                      {l.irregularidadesAbertas > 0 && (
                        <span style={{ padding: "3px 7px", borderRadius: 3, fontSize: 10.5, fontWeight: 600, background: "#F3DAD6", color: "#8C2B22" }}>
                          {l.irregularidadesAbertas} irregular.
                        </span>
                      )}
                      <span
                        style={{ padding: "3px 8px", borderRadius: 3, fontSize: 10.5, fontWeight: 600, background: l.statusInfo.bg, color: l.statusInfo.fg }}
                      >
                        {l.statusInfo.label}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {lote && (
            <section
              style={{
                background: "#fff",
                border: "1px solid #E01B22",
                borderRadius: 4,
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 2px 10px rgba(35,31,32,.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "15px 18px",
                  background: "#231F20",
                  color: "#fff",
                  borderRadius: "3px 3px 0 0",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, letterSpacing: ".03em", lineHeight: 1 }}>
                    Quadra {lote.quadra.nome} · Lote {lote.numero}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#A89F9F" }}>{lote.rua ?? "Endereço não informado"}</div>
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
                  {lote.irregularidadesAbertas > 0 && (
                    <span style={{ padding: "4px 9px", borderRadius: 3, fontSize: 11.5, fontWeight: 600, background: "#F3DAD6", color: "#8C2B22" }}>
                      {lote.irregularidadesAbertas} irregularidade(s) em aberto
                    </span>
                  )}
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#7A7472" }}>
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
                      <div style={{ fontSize: 10, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" }}>{k}</div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.35 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 11 }}>
                <div style={{ fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#7A7472" }}>
                  Protocolos deste lote
                </div>
                {lote.solicitacoes.length === 0 && (
                  <div style={{ fontSize: 12.5, color: "#7A7472" }}>Nenhuma solicitação registrada para este lote.</div>
                )}
                {lote.solicitacoes.map((s) => {
                  const info = STATUS_INFO[s.status];
                  const aberto = protocoloSel === s.id;
                  return (
                    <div key={s.id} style={{ border: `1px solid ${aberto ? "#E01B22" : "#EDE9E1"}`, borderRadius: 4, overflow: "hidden" }}>
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
                          <span style={{ fontSize: 11.5, color: "#7A7472" }}>
                            {TIPO_LABEL[s.tipo]} · aberta em {formatDate(s.createdAt)} · {s.historico.length} movimentação(ões)
                          </span>
                        </span>
                        <span style={{ color: "#7A7472", fontSize: 11 }}>{aberto ? "▾" : "▸"}</span>
                      </button>

                      {aberto && (
                        <div style={{ padding: "12px 13px 4px", borderTop: "1px solid #EDE9E1", background: "#FBFAF7" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 9, paddingBottom: 13 }}>
                            <Bloco titulo="Obra">
                              <Campo k="Tipo" v={TIPO_LABEL[s.tipo]} />
                              <Campo k="Área de intervenção" v={`${s.areaIntervencao.toLocaleString("pt-BR")} m²`} />
                              <Campo k="Área do lote" v={lote.areaM2 != null ? `${lote.areaM2.toLocaleString("pt-BR")} m²` : "—"} />
                              <Campo k="Endereço" v={lote.rua ?? "—"} />
                            </Bloco>

                            <Campo k="Descrição" v={s.descricao} bloco />

                            {s.irregularidades.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <div style={{ fontSize: 10, letterSpacing: ".13em", textTransform: "uppercase", color: "#8C2B22" }}>
                                  Irregularidades
                                </div>
                                {s.irregularidades.map((irr) => (
                                  <div key={irr.id} style={{ fontSize: 11.5, lineHeight: 1.45, color: irr.regularizadaEm ? "#7A7472" : "#8C2B22" }}>
                                    {IRREGULARIDADE_LABEL[irr.tipo]} · {formatDate(irr.createdAt)}
                                    {irr.regularizadaEm
                                      ? ` · regularizada em ${formatDate(irr.regularizadaEm)}`
                                      : " · em aberto"}
                                  </div>
                                ))}
                              </div>
                            )}

                            <Bloco titulo="Responsável técnico pelo projeto">
                              <Campo k="Nome" v={s.responsavelTecnicoNome || "—"} />
                              <Campo k="Registro" v={s.responsavelTecnicoRegistro || "—"} />
                              <Campo k="E-mail" v={s.responsavelTecnicoEmail || "—"} />
                            </Bloco>

                            <Bloco titulo="Responsável técnico pela execução">
                              <Campo k="Nome" v={s.rtExecucaoNome || "—"} />
                              <Campo k="Registro" v={s.rtExecucaoRegistro || "—"} />
                              <Campo k="E-mail" v={s.rtExecucaoEmail || "—"} />
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
                              <div style={{ fontSize: 10, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" }}>
                                Documentos anexados
                              </div>
                              {s.documentos.length === 0 ? (
                                <div style={{ fontSize: 12, color: "#7A7472" }}>Nenhum documento anexado.</div>
                              ) : (
                                s.documentos.map((d) => (
                                  <div key={d.id} style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 11.5, fontWeight: 600 }}>{DOC_LABEL[d.tipo].nome}</span>
                                    <a
                                      href={`/api/files/${d.id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ fontSize: 11.5, color: "#E01B22", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}
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

                            <div style={{ fontSize: 10, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472", paddingTop: 4 }}>
                              Histórico
                            </div>
                          </div>
                          {s.historico.length === 0 && (
                            <div style={{ fontSize: 12, color: "#7A7472", paddingBottom: 10 }}>
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
                                <span style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 11, color: "#7A7472", fontFamily: "var(--font-mono)" }}>
                                    {formatDateTime(h.createdAt)}
                                  </span>
                                  {h.autor && (
                                    <span style={{ fontSize: 11, color: "#4A5563" }}>
                                      {h.autor.name}
                                      <span style={{ color: "#8B939C" }}> · {ROLE_LABEL[h.autor.role]}</span>
                                    </span>
                                  )}
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
                                color: "#E01B22",
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
                      border: "1px solid #E01B22",
                      background: "#E01B22",
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
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#7A7472" }}>{q.resumo}</div>
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
                <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "#7A7472" }}>Prazos em risco</div>
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

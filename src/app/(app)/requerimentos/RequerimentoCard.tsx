"use client";

import { useState } from "react";
import { STATUS_INFO, DOC_LABEL, IRREGULARIDADE_LABEL, TIPO_LABEL, formatDate, formatDateTime } from "@/lib/status";
import { reenviarComplementacaoAction } from "@/lib/actions/requerimento-actions";
import { SubstituirDocumentos } from "./SubstituirDocumentos";
import { EnviarAlvara } from "./EnviarAlvara";
import type { getMeusRequerimentos } from "@/lib/queries/requerimentos";

type Pedidos = Awaited<ReturnType<typeof getMeusRequerimentos>>;
type Pedido = Pedidos[number];

const MENSAGEM_PADRAO: Record<string, string> = {
  ENVIADA: "Aguardando validação documental pela CAPE.",
  ANALISE: "Documentação validada. O projeto está em análise técnica pela CAPE.",
  APROVADA: "Projeto aprovado. Envie o alvará de execução da Prefeitura para a CAPE conferir e liberar o início da obra.",
  RESSALVAS: "Projeto aprovado com ressalvas. Envie o alvará de execução da Prefeitura para a CAPE conferir e liberar o início da obra.",
  ALVARA_CONFERENCIA: "Alvará de execução em conferência pela CAPE.",
  REPROVADA: "Solicitação reprovada. Uma nova análise exige nova taxa.",
  EXECUCAO: "Obra aprovada. Alvará conferido pela CAPE e início liberado.",
  CONCLUIDA: "Solicitação concluída.",
};

export function RequerimentoCard({ s }: { s: Pedido }) {
  const [aberto, setAberto] = useState(false);
  const info = STATUS_INFO[s.status];
  const mensagem = s.status === "COMPLEMENTO" || s.status === "REPROVADA" ? s.historico[0]?.texto ?? MENSAGEM_PADRAO[s.status] : MENSAGEM_PADRAO[s.status];
  const pendencias = [
    ...s.documentos
      .filter((d) => d.observacao)
      .map((d) => ({ titulo: DOC_LABEL[d.tipo].nome, referencia: null as string | null, texto: d.observacao! })),
    ...s.resultados.map((r) => ({ titulo: r.item.texto, referencia: r.item.referencia, texto: r.observacao! })),
  ];
  const etapas = [
    { titulo: "Solicitação enviada", data: formatDate(s.createdAt), cor: "#24603A" },
    { titulo: "Validação documental", data: s.status === "ENVIADA" ? "em andamento" : formatDate(s.updatedAt), cor: "#24603A" },
    {
      titulo: "Análise técnica (check-list)",
      data: s.status === "ANALISE" ? "em andamento" : s.status === "ENVIADA" ? "aguardando" : formatDate(s.updatedAt),
      cor: s.status === "ANALISE" ? "#B4711A" : s.status === "ENVIADA" ? "#A89F9F" : "#24603A",
    },
    { titulo: info.label, data: s.status === "COMPLEMENTO" ? "aguardando você" : "concluído", cor: s.status === "COMPLEMENTO" ? "#B4711A" : "#24603A" },
  ];

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #DDD8CE",
        borderLeft: `4px solid ${info.bg}`,
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1fr 16px",
          alignItems: "center",
          gap: 14,
          padding: "16px 20px",
          border: 0,
          background: aberto ? "#FBFAF7" : "#fff",
          textAlign: "left",
          cursor: "pointer",
          font: "inherit",
        }}
      >
        <span style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600 }}>{s.protocolo}</span>
            <span style={{ display: "inline-block", padding: "4px 9px", borderRadius: 3, fontSize: 11.5, fontWeight: 600, background: info.bg, color: info.fg }}>
              {info.label}
            </span>
            {(s.status === "COMPLEMENTO" || s.status === "APROVADA" || s.status === "RESSALVAS") && (
              <span style={{ fontSize: 11, color: "#8A5210", fontWeight: 600 }}>· aguardando você</span>
            )}
          </span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, lineHeight: 1.1 }}>
            {s.lote.quadra.nome} L{s.lote.numero} — {TIPO_LABEL[s.tipo]}
          </span>
        </span>
        <span style={{ color: "#7A7472", fontSize: 12 }}>{aberto ? "▾" : "▸"}</span>
      </button>

      {aberto && (
        <div className="layout-with-aside" style={{ "--aside-w": "300px", padding: "0 20px 20px", gap: 24 } as React.CSSProperties}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>
            <div style={{ fontSize: 13, color: "#4A5563", lineHeight: 1.5, maxWidth: "66ch" }}>{mensagem}</div>
            <div style={{ fontSize: 12, color: "#7A7472" }}>{s.descricao}</div>
            <span
              style={{ fontSize: 11.5, color: "#7A7472" }}
              title="Só os reenvios da etapa de análise técnica (check-list) são contados."
            >
              reenvios na análise técnica {s.reenvios} / {s.lote.empreendimento.reenviosSemTaxa}
            </span>

            {pendencias.length > 0 && (s.status === "COMPLEMENTO" || s.status === "REPROVADA") && (
              <div style={{ background: "#FDF8EE", border: "1px solid #E8D7B4", borderRadius: 4, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11 }}>
                <div style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#8A5210" }}>O que a CAPE apontou</div>
                {pendencias.map((p, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#6B4A11" }}>
                      {p.titulo}
                      {p.referencia && <span style={{ fontWeight: 400, color: "#8A5210" }}> · {p.referencia}</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#3B4653", lineHeight: 1.5, whiteSpace: "pre-line" }}>{p.texto}</div>
                  </div>
                ))}
              </div>
            )}

            {s.irregularidades.length > 0 && (
              <div style={{ background: "#FDF6F5", border: "1px solid #E8C9C4", borderRadius: 4, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#8C2B22" }}>Irregularidades constatadas na obra</div>
                {s.irregularidades.map((irr) => (
                  <div key={irr.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: irr.regularizadaEm ? "#4A5563" : "#8C2B22" }}>{IRREGULARIDADE_LABEL[irr.tipo]}</span>
                      <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "#7A7472" }}>{formatDate(irr.createdAt)}</span>
                      {irr.regularizadaEm && (
                        <span style={{ padding: "2px 7px", borderRadius: 3, fontSize: 10, fontWeight: 600, background: "#D8E9DA", color: "#24603A" }}>regularizada</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#3B4653", lineHeight: 1.5, whiteSpace: "pre-line" }}>{irr.descricao}</div>
                    {irr.evidencias.length > 0 && (
                      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                        {irr.evidencias.map((ev) => (
                          <a key={ev.id} href={`/api/irregularidades/${ev.id}`} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: "#E01B22", fontFamily: "var(--font-mono)" }}>
                            {ev.nomeArquivo}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {s.status === "COMPLEMENTO" && (
              <SubstituirDocumentos solicitacaoId={s.id} documentos={s.documentos} devolvidaNoChecklist={s.devolvidaNoChecklist} />
            )}

            {s.status === "COMPLEMENTO" && (
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                <form action={reenviarComplementacaoAction.bind(null, s.id)}>
                  <button
                    type="submit"
                    style={{ border: "1px solid #B4711A", background: "#B4711A", color: "#fff", borderRadius: 4, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                  >
                    Enviar complementação
                  </button>
                </form>
              </div>
            )}

            {(s.status === "APROVADA" || s.status === "RESSALVAS") && <EnviarAlvara solicitacaoId={s.id} recusa={s.alvaraRecusa} />}

            {s.status === "ALVARA_CONFERENCIA" && (
              <div style={{ fontSize: 12.5, color: "#4B3A7A", background: "#F3F0F9", border: "1px solid #D9D1EC", borderRadius: 4, padding: "12px 14px", lineHeight: 1.45 }}>
                Alvará enviado{s.alvaraEnviadoEm ? ` em ${formatDate(s.alvaraEnviadoEm)}` : ""} e em conferência pela CAPE. A obra pode começar assim que ele for aceito.{" "}
                <a href={`/api/alvara/${s.id}`} target="_blank" rel="noreferrer" style={{ color: "#4B3A7A", fontWeight: 600 }}>
                  Ver arquivo enviado
                </a>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 4, borderTop: "1px solid #EDE9E1", paddingTop: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" }}>Histórico da solicitação e da análise</div>
              {s.historico.length === 0 ? (
                <div style={{ fontSize: 12, color: "#7A7472" }}>Sem movimentações registradas ainda.</div>
              ) : (
                s.historico.map((h) => (
                  <div key={h.id} style={{ display: "grid", gridTemplateColumns: "12px 1fr", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: h.cor, marginTop: 5, flex: "none" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingBottom: 10 }}>
                      <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{h.texto}</div>
                      <div style={{ fontSize: 11, color: "#7A7472", fontFamily: "var(--font-mono)" }}>
                        {formatDateTime(h.createdAt)}
                        {h.autor?.name ? ` · ${h.autor.name}` : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 0, borderLeft: "1px solid #EDE9E1", paddingLeft: 20, paddingTop: 4 }}>
            {etapas.map((e, i) => (
              <div key={e.titulo} style={{ display: "grid", gridTemplateColumns: "14px 1fr", gap: 10, paddingBottom: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: e.cor, marginTop: 4 }} />
                  {i < etapas.length - 1 && <span style={{ flex: 1, width: 1, background: "#E4DFD5" }} />}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#231F20" }}>{e.titulo}</div>
                  <div style={{ fontSize: 11, color: "#7A7472", fontFamily: "var(--font-mono)" }}>{e.data}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

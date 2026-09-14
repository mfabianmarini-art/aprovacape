"use client";

import { useState } from "react";
import Link from "next/link";
import { TIPO_LABEL, IRREGULARIDADE_LABEL, formatDate, formatDateTime } from "@/lib/status";
import { diasDesde } from "@/lib/prazo";
import { IrregularidadeForm } from "@/components/IrregularidadeForm";
import { regularizarIrregularidadeAction, concluirObraAction } from "@/lib/actions/analise-actions";
import type { getObrasEmAndamento } from "@/lib/queries/obras";

type Obras = Awaited<ReturnType<typeof getObrasEmAndamento>>;
type Obra = Obras[number];

const SITUACOES = ["Todas", "Com irregularidade em aberto", "Sem irregularidade"] as const;

const COLUNAS = "120px 140px 1fr 140px 1fr 210px";

const chip = (ativo: boolean, cor: string): React.CSSProperties => ({
  border: `1px solid ${ativo ? cor : "#DDD8CE"}`,
  background: ativo ? cor : "#FFFFFF",
  color: ativo ? "#FFFFFF" : "#4A5563",
  borderRadius: 20,
  padding: "6px 13px",
  fontSize: 12,
  cursor: "pointer",
});

export function ObrasTable({ obras }: { obras: Obras }) {
  const [situacao, setSituacao] = useState<(typeof SITUACOES)[number]>("Todas");
  const [empreendimentoFiltro, setEmpreendimentoFiltro] = useState("Todos");

  const empreendimentos = Array.from(new Set(obras.map((o) => o.lote.empreendimento.nome))).sort();

  const linhas = obras.filter((o) => {
    const temAberta = o.irregularidades.some((i) => !i.regularizadaEm);
    const casaSituacao =
      situacao === "Todas" || (situacao === "Com irregularidade em aberto" ? temAberta : !temAberta);
    const casaEmpreendimento =
      empreendimentoFiltro === "Todos" || o.lote.empreendimento.nome === empreendimentoFiltro;
    return casaSituacao && casaEmpreendimento;
  });

  return (
    <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, overflow: "hidden" }}>
      {empreendimentos.length > 1 && (
        <div style={{ display: "flex", gap: 8, padding: "13px 18px", borderBottom: "1px solid #EDE9E1", flexWrap: "wrap" }}>
          {["Todos", ...empreendimentos].map((e) => (
            <button key={e} onClick={() => setEmpreendimentoFiltro(e)} style={chip(empreendimentoFiltro === e, "#B4711A")}>
              {e}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, padding: "13px 18px", borderBottom: "1px solid #EDE9E1", flexWrap: "wrap" }}>
        {SITUACOES.map((s) => (
          <button key={s} onClick={() => setSituacao(s)} style={chip(situacao === s, "#3B3486")}>
            {s}
          </button>
        ))}
      </div>
      {linhas.length === 0 && (
        <div style={{ padding: 24, fontSize: 13, color: "#6B7480" }}>
          {obras.length === 0
            ? "Nenhuma obra com início liberado. A obra entra aqui quando a CAPE aceita o alvará de execução."
            : "Nenhuma obra neste filtro."}
        </div>
      )}
      {linhas.length > 0 && (
        <div className="table-scroll">
          <div style={{ minWidth: 960 }}>
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
            {linhas.map((o) => (
              <ObraLinha key={o.id} obra={o} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ObraLinha({ obra }: { obra: Obra }) {
  // Um painel de cada vez: registrar e arquivar são decisões opostas sobre a mesma obra.
  const [painel, setPainel] = useState<"nenhum" | "irregularidade" | "concluir">("nenhum");

  const emAberto = obra.irregularidades.filter((i) => !i.regularizadaEm);
  const travadoPorIrregularidade = emAberto.length > 0;
  const liberadaEm = obra.historico[0]?.createdAt ?? null;

  return (
    <div style={{ borderBottom: "1px solid #F1EEE7" }}>
      <div style={{ display: "grid", gridTemplateColumns: COLUNAS, alignItems: "center", padding: "14px 18px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{obra.protocolo}</div>
        <div style={{ fontSize: 12, color: "#4A5563", paddingRight: 10 }}>{obra.lote.empreendimento.nome}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingRight: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>
            {obra.lote.quadra.nome} L{obra.lote.numero}
          </div>
          <div style={{ fontSize: 11.5, color: "#6B7480" }}>
            {TIPO_LABEL[obra.tipo]} · {obra.areaConstruida} m² · RT {obra.responsavelTecnicoNome}
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#4A5563", fontFamily: "var(--font-mono)", paddingRight: 12 }}>
          {liberadaEm ? (
            <>
              {formatDate(liberadaEm)}
              <div style={{ fontSize: 11, color: "#6B7480" }}>há {diasDesde(liberadaEm)}d</div>
            </>
          ) : (
            // Obras liberadas antes de existir a conferência de alvará não têm o evento.
            <span style={{ color: "#6B7480" }}>não registrado</span>
          )}
        </div>
        <div style={{ paddingRight: 16 }}>
          {travadoPorIrregularidade ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#8C2B22" }}>
                {emAberto.length} irregularidade{emAberto.length > 1 ? "s" : ""} em aberto
              </span>
              <span style={{ fontSize: 11.5, color: "#6B7480" }}>
                {IRREGULARIDADE_LABEL[emAberto[0]!.tipo]}
                {emAberto.length > 1 && ` e mais ${emAberto.length - 1}`}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: "#24603A" }}>Sem irregularidade em aberto</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
          <button
            type="button"
            onClick={() => setPainel(painel === "irregularidade" ? "nenhum" : "irregularidade")}
            style={{
              border: "1px solid #8C2B22",
              background: painel === "irregularidade" ? "#8C2B22" : "#fff",
              color: painel === "irregularidade" ? "#fff" : "#8C2B22",
              borderRadius: 4,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
            }}
          >
            Registrar irregularidade
          </button>
          <button
            type="button"
            onClick={() => setPainel(painel === "concluir" ? "nenhum" : "concluir")}
            disabled={travadoPorIrregularidade}
            title={travadoPorIrregularidade ? "Regularize as pendências antes de concluir." : undefined}
            style={{
              border: `1px solid ${travadoPorIrregularidade ? "#DDD8CE" : "#0E1B24"}`,
              background: painel === "concluir" ? "#0E1B24" : "#fff",
              color: travadoPorIrregularidade ? "#B0AAA0" : painel === "concluir" ? "#fff" : "#0E1B24",
              borderRadius: 4,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: travadoPorIrregularidade ? "not-allowed" : "pointer",
              width: "100%",
            }}
          >
            Obra concluída
          </button>
          <Link href={`/analise/${obra.protocolo}`} style={{ fontSize: 11.5, color: "#12455E" }}>
            Abrir ficha completa
          </Link>
        </div>
      </div>

      {painel === "irregularidade" && (
        <div style={{ padding: "0 18px 16px", display: "flex", flexDirection: "column", gap: 11 }}>
          {obra.irregularidades.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {obra.irregularidades.map((irr) => (
                <div
                  key={irr.id}
                  style={{
                    border: `1px solid ${irr.regularizadaEm ? "#EDE9E1" : "#E8C9C4"}`,
                    background: irr.regularizadaEm ? "#FBFAF7" : "#FDF6F5",
                    borderRadius: 4,
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 7,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: irr.regularizadaEm ? "#4A5563" : "#8C2B22" }}>
                      {IRREGULARIDADE_LABEL[irr.tipo]}
                    </span>
                    <span style={{ fontSize: 11, color: "#6B7480", fontFamily: "var(--font-mono)" }}>
                      {formatDateTime(irr.createdAt)} · {irr.registradaPor.name}
                      {irr.regularizadaEm && ` · regularizada em ${formatDateTime(irr.regularizadaEm)}`}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#3B4653", whiteSpace: "pre-line" }}>{irr.descricao}</div>
                  {irr.evidencias.length > 0 && (
                    <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                      {irr.evidencias.map((ev) => (
                        <a
                          key={ev.id}
                          href={`/api/irregularidades/${ev.id}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 11.5, color: "#12455E", fontFamily: "var(--font-mono)" }}
                        >
                          {ev.nomeArquivo}
                        </a>
                      ))}
                    </div>
                  )}
                  {!irr.regularizadaEm && (
                    <form action={regularizarIrregularidadeAction.bind(null, irr.id)}>
                      <button
                        type="submit"
                        style={{ border: "1px solid #C6DAC9", background: "#fff", color: "#24603A", borderRadius: 4, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >
                        Marcar como regularizada
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
          <IrregularidadeForm solicitacaoId={obra.id} onCancelar={() => setPainel("nenhum")} />
        </div>
      )}

      {painel === "concluir" && (
        // Confirmação porque aqui as obras ficam empilhadas: um clique fora de mira
        // arquivaria o protocolo da linha vizinha.
        <div
          style={{
            margin: "0 18px 16px",
            border: "1px solid #DDD8CE",
            background: "#FAF9F6",
            borderRadius: 4,
            padding: 15,
            display: "flex",
            flexDirection: "column",
            gap: 11,
          }}
        >
          <div style={{ fontSize: 12.5, color: "#3B4653", lineHeight: 1.5 }}>
            Encerrar o protocolo <strong>{obra.protocolo}</strong> ({obra.lote.quadra.nome} L{obra.lote.numero})?
            A obra sai do acompanhamento e a solicitação vai para o arquivo. O histórico e os documentos
            continuam consultáveis.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <form action={concluirObraAction.bind(null, obra.id)}>
              <button
                type="submit"
                style={{ border: "1px solid #0E1B24", background: "#0E1B24", color: "#fff", borderRadius: 4, padding: "9px 15px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
              >
                Confirmar conclusão e arquivar
              </button>
            </form>
            <button
              type="button"
              onClick={() => setPainel("nenhum")}
              style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#4A5563", borderRadius: 4, padding: "9px 12px", fontSize: 12.5, cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

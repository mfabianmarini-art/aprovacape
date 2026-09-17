"use client";

import { useState } from "react";
import { ROLE_LABEL, ROLE_COLOR } from "@/lib/nav";
import { formatDate, formatDataPura } from "@/lib/status";
import { formatarCpf, mesmoCpf } from "@/lib/cpf";
import { formatRegistro } from "@/lib/registro-profissional";
import { aprovarVinculoAction, recusarVinculoAction } from "@/lib/actions/usuarios-actions";
import type { getVinculosPendentes } from "@/lib/queries/usuarios";

type Pendentes = Awaited<ReturnType<typeof getVinculosPendentes>>;

const COLUNAS = "150px 150px 1fr 165px 120px 34px";

export function VinculosTable({ pendentes }: { pendentes: Pendentes }) {
  const [aberta, setAberta] = useState<string | null>(null);

  return (
    <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, overflow: "hidden" }}>
      {pendentes.length === 0 && (
        <div style={{ padding: 24, fontSize: 13, color: "#7A7472" }}>Nenhum vínculo aguardando validação.</div>
      )}
      {pendentes.length > 0 && (
        <div className="table-scroll">
          <div style={{ minWidth: 800 }}>
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
                color: "#7A7472",
              }}
            >
              <div>Empreendimento</div>
              <div>Quadra / lote</div>
              <div>Solicitante</div>
              <div>Perfil</div>
              <div>Solicitado em</div>
              <div />
            </div>

            {pendentes.map((p) => {
        const cor = ROLE_COLOR[p.role];
        const expandida = aberta === p.id;
        const registro = formatRegistro(p);
        const ehRT = p.role === "RESPONSAVEL_TECNICO";
        const lotesJa = ehRT ? p.lotesComoRT : p.lotesComoProprietario;
        // Aprovar grava este usuário em Lote.proprietarioId/rtId por cima de quem estiver lá.
        const ocupante = ehRT ? p.vinculoLote?.rt?.name : p.vinculoLote?.proprietario?.name;
        // O lote já tem proprietário cadastrado e o RT declarou outro CPF: a autorização
        // anexada não pode ser conferida contra o dono do lote, então a aprovação trava
        // até alguém resolver a divergência.
        const donoDoLote = p.vinculoLote?.proprietario ?? null;
        const divergenciaProprietario =
          ehRT && donoDoLote?.cpf && p.vinculoPropCpf && !mesmoCpf(donoDoLote.cpf, p.vinculoPropCpf)
            ? donoDoLote
            : null;
        return (
          <div key={p.id} style={{ borderBottom: "1px solid #F1EEE7" }}>
            <button
              type="button"
              onClick={() => setAberta(expandida ? null : p.id)}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: COLUNAS,
                alignItems: "center",
                padding: "14px 18px",
                border: 0,
                background: expandida ? "#FAF9F6" : "#fff",
                textAlign: "left",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              <div style={{ fontSize: 12, color: "#4A5563", paddingRight: 10 }}>
                {p.vinculoLote?.empreendimento.nome ?? "—"}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                {p.vinculoLote ? `${p.vinculoLote.quadra.nome} L${p.vinculoLote.numero}` : "—"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingRight: 16 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 11.5, color: "#7A7472" }}>{p.email}</div>
                <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: lotesJa.length ? "#3B3486" : "#7A7472" }}>
                  {lotesJa.length ? `novo vínculo · já tem ${lotesJa.length} lote(s)` : "cadastro novo"}
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
                    background: cor.bg,
                    color: cor.fg,
                  }}
                >
                  {ROLE_LABEL[p.role]}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#4A5563", fontFamily: "var(--font-mono)" }}>
                {formatDate(p.vinculoSolicitadoEm ?? p.createdAt)}
              </div>
              <div style={{ color: "#7A7472", fontSize: 12 }}>{expandida ? "▾" : "▸"}</div>
            </button>

            {expandida && (
              <div
                style={{
                  padding: "4px 18px 20px",
                  background: "#FAF9F6",
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) 260px",
                  gap: 24,
                  alignItems: "start",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {(
                    [
                      ["Nome", p.name],
                      ["E-mail", p.email],
                      ["Telefone", p.phone],
                      ["CPF", formatarCpf(p.cpf)],
                      ["Nascimento", formatDataPura(p.birthDate)],
                      ["Perfil", ROLE_LABEL[p.role]],
                      ...(registro ? [["Registro", registro] as const] : []),
                      ["Empreendimento", p.vinculoLote?.empreendimento.nome ?? "—"],
                      [
                        "Lote pretendido",
                        p.vinculoLote
                          ? `${p.vinculoLote.quadra.nome} L${p.vinculoLote.numero} · ${p.vinculoLote.empreendimento.cidade}/${p.vinculoLote.empreendimento.uf}`
                          : "—",
                      ],
                      [
                        "Lotes já vinculados",
                        lotesJa.length
                          ? lotesJa.map((l) => `${l.empreendimento.nome} · ${l.quadra.nome} L${l.numero}`).join(", ")
                          : "nenhum — cadastro novo",
                      ],
                      // Declarados pelo RT: é contra estes dados que a autorização
                      // anexada precisa bater.
                      ...(p.vinculoPropNome
                        ? ([
                            ["Proprietário declarado", p.vinculoPropNome],
                            ["CPF do proprietário", p.vinculoPropCpf ? formatarCpf(p.vinculoPropCpf) : "—"],
                            ["E-mail do proprietário", p.vinculoPropEmail ?? "—"],
                            ["Telefone do proprietário", p.vinculoPropTelefone ?? "—"],
                          ] as const)
                        : []),
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, fontSize: 12.5 }}>
                      <span style={{ color: "#7A7472", letterSpacing: ".06em", textTransform: "uppercase", fontSize: 10, paddingTop: 2 }}>
                        {k}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "#3B4653" }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, fontSize: 12.5 }}>
                    <span style={{ color: "#7A7472", letterSpacing: ".06em", textTransform: "uppercase", fontSize: 10, paddingTop: 2 }}>
                      Comprovação
                    </span>
                    {p.vinculoArquivoCaminho ? (
                      <a
                        href={`/api/vinculo-autorizacao/${p.id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12.5, fontWeight: 600, color: "#E01B22" }}
                      >
                        {p.vinculoArquivoNome ?? "Autorização do proprietário"}
                      </a>
                    ) : (
                      <span style={{ fontFamily: "var(--font-mono)", color: "#3B4653" }}>
                        {p.vinculoComprovacao ?? "—"}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #DDD8CE",
                    borderTop: "3px solid #B4711A",
                    borderRadius: 4,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 12, color: "#4A5563", lineHeight: 1.5 }}>
                    Aprovar vincula a pessoa ao lote e libera o envio de projetos. Recusar mantém o acesso à
                    plataforma, mas sem vínculo com este lote.
                  </div>
                  {ocupante && (
                    <div style={{ fontSize: 12, color: "#8C2B22", background: "#FDF6F5", border: "1px solid #E8C9C4", borderRadius: 4, padding: "9px 11px", lineHeight: 1.45 }}>
                      Este lote já tem {ehRT ? "RT" : "proprietário"}: <strong>{ocupante}</strong>. Aprovar substitui esse vínculo.
                    </div>
                  )}
                  {divergenciaProprietario && (
                    <div style={{ fontSize: 12, color: "#8C2B22", background: "#FDF6F5", border: "1px solid #E8C9C4", borderRadius: 4, padding: "11px 12px", lineHeight: 1.5, display: "flex", flexDirection: "column", gap: 5 }}>
                      <strong>O proprietário declarado não é o proprietário do lote.</strong>
                      <span>
                        Cadastrado no lote: {divergenciaProprietario.name} · {formatarCpf(divergenciaProprietario.cpf)}
                      </span>
                      <span>
                        Declarado no pedido: {p.vinculoPropNome} · {formatarCpf(p.vinculoPropCpf ?? "")}
                      </span>
                      <span>
                        A autorização anexada não pode ser conferida contra o dono do lote. Recuse o pedido ou
                        corrija o cadastro antes de aprovar.
                      </span>
                    </div>
                  )}
                  <form action={divergenciaProprietario ? undefined : aprovarVinculoAction.bind(null, p.id)}>
                    <button
                      type="submit"
                      disabled={!!divergenciaProprietario}
                      title={divergenciaProprietario ? "Resolva a divergência de proprietário antes de aprovar." : undefined}
                      style={{
                        width: "100%",
                        border: `1px solid ${divergenciaProprietario ? "#DDD8CE" : "#24603A"}`,
                        background: divergenciaProprietario ? "#fff" : "#24603A",
                        color: divergenciaProprietario ? "#B0AAA0" : "#fff",
                        borderRadius: 4,
                        padding: "10px 12px",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: divergenciaProprietario ? "not-allowed" : "pointer",
                      }}
                    >
                      Aprovar vínculo
                    </button>
                  </form>
                  <form action={recusarVinculoAction.bind(null, p.id)}>
                    <button
                      type="submit"
                      style={{
                        width: "100%",
                        border: "1px solid #DDD8CE",
                        background: "#fff",
                        color: "#8C2B22",
                        borderRadius: 4,
                        padding: "10px 12px",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Reprovar vínculo
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

"use client";

import { useActionState, useState } from "react";
import { STATUS_INFO, DOC_LABEL, IRREGULARIDADE_LABEL, TIPO_LABEL, formatDate, formatDateTime } from "@/lib/status";
import { etapasDaSolicitacao } from "@/lib/etapas";
import {
  reenviarComplementacaoAction,
  reenviarAcessoProprietarioAction,
  type ReenvioState,
} from "@/lib/actions/requerimento-actions";
import { EtapasStepper } from "@/components/EtapasStepper";
import { CopiarTexto } from "@/components/CopiarTexto";
import { SubstituirDocumentos } from "./SubstituirDocumentos";
import { EnviarAlvara } from "./EnviarAlvara";
import type { getMeusRequerimentos } from "@/lib/queries/requerimentos";

type Pedidos = Awaited<ReturnType<typeof getMeusRequerimentos>>;
// A senha cifrada fica no servidor: o card recebe só a senha já decifrada, e só quando
// quem olha é o RT do lote.
export type PedidoCard = Omit<Pedidos[number], "acompanhamentoSenhaCifrada">;

// "proprietario": conta de proprietário, que só acompanha. "outro-rt": RT que protocolou,
// mas o lote hoje é de outro profissional.
export type SomenteLeitura = "proprietario" | "outro-rt";

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

const AVISO_LEITURA: Record<SomenteLeitura, string> = {
  proprietario:
    "Visualização do proprietário: a solicitação é aberta e movimentada pelo responsável técnico. Aqui você acompanha o andamento.",
  "outro-rt":
    "Este lote está vinculado a outro responsável hoje. Você continua vendo o que protocolou, mas as ações da solicitação passaram para quem está vinculado ao lote.",
};

export function RequerimentoCard({
  s,
  somenteLeitura,
  senhaAcompanhamento,
  urlAcompanhamento,
  abertoInicial = false,
}: {
  s: PedidoCard;
  somenteLeitura?: SomenteLeitura;
  senhaAcompanhamento?: string | null;
  urlAcompanhamento: string;
  abertoInicial?: boolean;
}) {
  const [aberto, setAberto] = useState(abertoInicial);
  const info = STATUS_INFO[s.status];
  const podeAgir = !somenteLeitura;
  const mensagem = s.status === "COMPLEMENTO" || s.status === "REPROVADA" ? s.historico[0]?.texto ?? MENSAGEM_PADRAO[s.status] : MENSAGEM_PADRAO[s.status];
  const pendencias = [
    ...s.documentos
      .filter((d) => d.observacao)
      .map((d) => ({ titulo: DOC_LABEL[d.tipo].nome, referencia: null as string | null, texto: d.observacao! })),
    ...s.resultados.map((r) => ({ titulo: r.item.texto, referencia: r.item.referencia, texto: r.observacao! })),
  ];
  const aguardandoRT = s.status === "COMPLEMENTO" || s.status === "APROVADA" || s.status === "RESSALVAS";

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
        aria-expanded={aberto}
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1fr 16px",
          alignItems: "center",
          gap: 14,
          padding: "16px 20px 10px",
          border: 0,
          background: "#fff",
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
            {podeAgir && aguardandoRT && <span style={{ fontSize: 11, color: "#8A5210", fontWeight: 600 }}>· aguardando você</span>}
          </span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, lineHeight: 1.1 }}>
            {s.lote.quadra.nome} L{s.lote.numero} — {TIPO_LABEL[s.tipo]}
          </span>
        </span>
        <span style={{ color: "#7A7472", fontSize: 12 }}>{aberto ? "▾" : "▸"}</span>
      </button>

      {/* Etapas à vista mesmo com o card fechado: é a primeira coisa que se quer saber. */}
      <div style={{ padding: "4px 20px 16px" }}>
        <EtapasStepper etapas={etapasDaSolicitacao(s)} legenda={aberto} />
      </div>

      {aberto && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 20px 20px", borderTop: "1px solid #EDE9E1", background: "#FFFFFF" }}>
          <div style={{ fontSize: 13, color: "#4A5563", lineHeight: 1.5, maxWidth: "66ch" }}>{mensagem}</div>
          <div style={{ fontSize: 12, color: "#7A7472" }}>{s.descricao}</div>
          <span style={{ fontSize: 11.5, color: "#7A7472" }} title="Só os reenvios da etapa de análise técnica (check-list) são contados.">
            reenvios na análise técnica {s.reenvios} / {s.lote.empreendimento.reenviosSemTaxa}
          </span>

          {podeAgir && (
            <SenhaProprietario
              solicitacaoId={s.id}
              protocolo={s.protocolo}
              senha={senhaAcompanhamento ?? null}
              url={urlAcompanhamento}
              email={s.proprietarioEmail}
              enviadoEm={s.acompanhamentoEnviadoEm}
            />
          )}

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

          {s.devolutivas.length > 0 && (
            <div style={{ background: "#F4F6F8", border: "1px solid #D5DCE2", borderRadius: 4, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#2E4653" }}>Apontamentos da CAPE na análise técnica</div>
              {s.devolutivas.map((d) => (
                <div key={d.id} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "#7A7472" }}>{formatDateTime(d.createdAt)}</div>
                  {d.comentario && <div style={{ fontSize: 12.5, color: "#3B4653", lineHeight: 1.5, whiteSpace: "pre-line" }}>{d.comentario}</div>}
                  {d.arquivoNome && (
                    <a href={`/api/devolutivas/${d.id}`} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 600, color: "#E01B22" }}>
                      Baixar arquivo com os apontamentos — {d.arquivoNome}
                    </a>
                  )}
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

          {somenteLeitura && (
            <div style={{ fontSize: 12.5, color: "#6B4A11", background: "#FDF8EE", border: "1px solid #E8D7B4", borderRadius: 4, padding: "12px 14px", lineHeight: 1.45 }}>
              {AVISO_LEITURA[somenteLeitura]}
            </div>
          )}

          {s.status === "COMPLEMENTO" && podeAgir && (
            <SubstituirDocumentos solicitacaoId={s.id} documentos={s.documentos} devolvidaNoChecklist={s.devolvidaNoChecklist} />
          )}

          {s.status === "COMPLEMENTO" && podeAgir && (
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

          {(s.status === "APROVADA" || s.status === "RESSALVAS") && podeAgir && <EnviarAlvara solicitacaoId={s.id} recusa={s.alvaraRecusa} />}

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
                    <div style={{ fontSize: 12.5, lineHeight: 1.4, whiteSpace: "pre-line" }}>{h.texto}</div>
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
      )}
    </section>
  );
}

function SenhaProprietario({
  solicitacaoId,
  protocolo,
  senha,
  url,
  email,
  enviadoEm,
}: {
  solicitacaoId: string;
  protocolo: string;
  senha: string | null;
  url: string;
  email: string | null;
  enviadoEm: Date | null;
}) {
  const [state, formAction, pending] = useActionState<ReenvioState, FormData>(reenviarAcessoProprietarioAction.bind(null, solicitacaoId), null);
  return (
    <div style={{ background: "#F6FAF7", border: "1px solid #C6DAC9", borderRadius: 4, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#24603A" }}>Acompanhamento do proprietário</div>
      <div style={{ fontSize: 12.5, color: "#3B4653", lineHeight: 1.5 }}>
        {enviadoEm && email ? (
          <>
            Protocolo e senha enviados por e-mail para <strong>{email}</strong> em {formatDateTime(enviadoEm)}, com cópia para você. O
            proprietário acompanha em{" "}
          </>
        ) : (
          <>
            O acesso ainda não chegou ao proprietário por e-mail — repasse o protocolo e a senha abaixo. Ele acompanha em{" "}
          </>
        )}
        <a href="/acompanhar" target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
          {url}
        </a>
        , sem conta e sem poder alterar nada.
      </div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#7A7472" }}>Protocolo</span>
          <strong style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>{protocolo}</strong>
          <CopiarTexto texto={protocolo} />
        </span>
        {senha ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#7A7472" }}>Senha</span>
            <strong style={{ fontFamily: "var(--font-mono)", fontSize: 14, letterSpacing: ".06em" }}>{senha}</strong>
            <CopiarTexto texto={senha} />
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "#8A5210" }}>Ainda sem senha de acompanhamento.</span>
        )}
      </div>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (senha && !confirm("Enviar uma nova senha? A senha atual deixa de funcionar.")) e.preventDefault();
        }}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", borderTop: "1px solid #DCE9DF", paddingTop: 10 }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 240px" }}>
          <span style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#7A7472" }}>E-mail do proprietário</span>
          <input
            name="proprietarioEmail"
            type="email"
            required
            defaultValue={email ?? ""}
            style={{ border: "1px solid #C6DAC9", borderRadius: 4, padding: "7px 9px", fontSize: 12.5, background: "#fff" }}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          style={{ border: "1px solid #24603A", background: "#fff", color: "#24603A", borderRadius: 4, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: pending ? "wait" : "pointer" }}
        >
          {pending ? "Enviando…" : senha ? "Reenviar com nova senha" : "Gerar e enviar senha"}
        </button>
      </form>
      {state?.ok && <div style={{ fontSize: 12, color: "#24603A" }}>{state.ok}</div>}
      {state?.error && <div style={{ fontSize: 12, color: "#8A5210" }}>{state.error}</div>}
    </div>
  );
}

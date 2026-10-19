"use client";

import { useActionState, useState } from "react";
import { STATUS_INFO, DOC_LABEL, DOC_ORDER, IRREGULARIDADE_LABEL, TIPO_LABEL, formatDate, formatDateTime } from "@/lib/status";
import { etapasDaSolicitacao } from "@/lib/etapas";
import { prazoAnaliseTexto } from "@/lib/prazo";
import { proximaAcaoDoRT } from "@/lib/proxima-acao";
import { reenviarComplementacaoAction, type ReenvioState } from "@/lib/actions/requerimento-actions";
import { EtapasStepper } from "@/components/EtapasStepper";
import { SubstituirDocumentos } from "./SubstituirDocumentos";
import { VersoesAnteriores } from "@/components/VersoesAnteriores";
import { EnviarAlvara } from "./EnviarAlvara";
import type { getMeusRequerimentos } from "@/lib/queries/requerimentos";

type Pedidos = Awaited<ReturnType<typeof getMeusRequerimentos>>;
// A senha cifrada fica no servidor: o card recebe só a senha já decifrada, e só quando
// quem olha é o RT do lote.
export type PedidoCard = Omit<Pedidos[number], "acompanhamentoSenhaCifrada">;

// "proprietario": conta de proprietário, que só acompanha. "outro-rt": RT que protocolou,
// mas o lote hoje é de outro profissional.
export type SomenteLeitura = "proprietario" | "outro-rt";

// O que está acontecendo quando não há nada para o RT fazer.
const AGUARDANDO: Record<string, string> = {
  ENVIADA: "A CAPE está conferindo a documentação enviada.",
  ANALISE: "Documentação validada. O projeto está em análise técnica pela CAPE.",
  ALVARA_CONFERENCIA: "A CAPE está conferindo o alvará e a ART/RRT de execução. A obra pode começar assim que forem aceitos.",
  REPROVADA: "Solicitação reprovada. Uma nova análise exige nova solicitação e nova taxa.",
  EXECUCAO: "Obra liberada. Alvará conferido pela CAPE e início autorizado.",
  CONCLUIDA: "Obra concluída.",
  COMPLEMENTO: "Devolvida para complementação: o responsável técnico do lote deve corrigir e reenviar.",
  APROVADA: "Projeto aprovado: o responsável técnico do lote deve enviar o alvará de execução e a ART/RRT de execução.",
  RESSALVAS: "Projeto aprovado com ressalvas: o responsável técnico do lote deve enviar o alvará de execução e a ART/RRT de execução.",
};

const AVISO_LEITURA: Record<SomenteLeitura, string> = {
  proprietario:
    "Visualização do proprietário: a solicitação é aberta e movimentada pelo responsável técnico. Aqui você acompanha o andamento.",
  "outro-rt":
    "Este lote está vinculado a outro responsável hoje. Você continua vendo o que protocolou, mas as ações da solicitação passaram para quem está vinculado ao lote.",
};

const DEVOLUCAO = new Set(["DOCUMENTACAO_DEVOLVIDA", "CHECKLIST_DEVOLVIDO"]);

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
  const podeAgir = !somenteLeitura;
  const acao = podeAgir ? proximaAcaoDoRT(s.status) : null;
  // Com algo a fazer, o card já abre: a próxima ação é a primeira coisa que se quer ver.
  const [aberto, setAberto] = useState(abertoInicial || !!acao);
  const info = STATUS_INFO[s.status];

  const pendencias = [
    ...s.documentos
      .filter((d) => d.observacao)
      .map((d) => ({ titulo: DOC_LABEL[d.tipo].nome, referencia: null as string | null, texto: d.observacao! })),
    ...s.resultados.map((r) => ({ titulo: r.item.texto, referencia: r.item.referencia, texto: r.observacao! })),
  ];
  // Histórico vem do mais novo para o mais antigo.
  const devolucao = s.historico.find((h) => DEVOLUCAO.has(h.tipo));
  const trocados = devolucao ? s.documentos.filter((d) => new Date(d.uploadedAt) > new Date(devolucao.createdAt)) : [];
  const ultimaDevolutiva = s.status === "COMPLEMENTO" && s.devolvidaNoChecklist ? s.devolutivas[0] : undefined;
  const devolutivasAntigas = s.devolutivas.filter((d) => d !== ultimaDevolutiva);
  const irregAbertas = s.irregularidades.filter((i) => !i.regularizadaEm);
  const irregResolvidas = s.irregularidades.filter((i) => i.regularizadaEm);

  return (
    <section
      style={{
        background: "#fff",
        border: `1px solid ${acao ? "#E8B4AE" : "#DDD8CE"}`,
        borderLeft: `4px solid ${acao ? "#E01B22" : info.bg}`,
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
          </span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, lineHeight: 1.1 }}>
            {s.lote.quadra.nome} L{s.lote.numero} — {TIPO_LABEL[s.tipo]}
          </span>
          {acao && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, alignSelf: "flex-start", background: "#E01B22", color: "#fff", borderRadius: 3, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
              Sua vez: {acao}
            </span>
          )}
        </span>
        <span style={{ color: "#7A7472", fontSize: 12 }}>{aberto ? "▾" : "▸"}</span>
      </button>

      {/* Etapas à vista mesmo com o card fechado: é a primeira coisa que se quer saber. */}
      <div style={{ padding: "4px 20px 16px" }}>
        <EtapasStepper etapas={etapasDaSolicitacao(s)} legenda={false} />
      </div>

      {aberto && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "16px 20px 20px", borderTop: "1px solid #EDE9E1" }}>
          {somenteLeitura && (
            <div style={{ fontSize: 12.5, color: "#6B4A11", background: "#FDF8EE", border: "1px solid #E8D7B4", borderRadius: 4, padding: "12px 14px", lineHeight: 1.45 }}>
              {AVISO_LEITURA[somenteLeitura]}
            </div>
          )}

          {/* ---------- O que fazer agora ---------- */}
          {acao && s.status === "COMPLEMENTO" && (
            <PainelAcao titulo="Corrija e reenvie a documentação" subtitulo={devolucao ? `Devolvida pela CAPE em ${formatDateTime(devolucao.createdAt)}.` : undefined}>
              <Passo n={1} feito={false} titulo="Veja o que a CAPE apontou">
                {pendencias.length > 0 ? (
                  <ListaPendencias pendencias={pendencias} />
                ) : (
                  <div style={{ fontSize: 12.5, color: "#3B4653", lineHeight: 1.5, whiteSpace: "pre-line" }}>{devolucao?.texto}</div>
                )}
                {ultimaDevolutiva && <Devolutiva d={ultimaDevolutiva} />}
              </Passo>
              <Passo
                n={2}
                feito={trocados.length > 0}
                titulo={trocados.length > 0 ? `Arquivos substituídos (${trocados.length})` : "Substitua os arquivos corrigidos"}
              >
                <SubstituirDocumentos solicitacaoId={s.id} documentos={s.documentos} devolvidaNoChecklist={s.devolvidaNoChecklist} trocadosIds={trocados.map((d) => d.id)} />
              </Passo>
              <Passo n={3} feito={false} titulo="Envie a complementação para a CAPE">
                <EnviarComplementacao
                  solicitacaoId={s.id}
                  faltando={DOC_ORDER.filter((t) => !s.documentos.some((d) => d.tipo === t)).map((t) => DOC_LABEL[t].nome)}
                  semTroca={!!devolucao && trocados.length === 0}
                />
              </Passo>
            </PainelAcao>
          )}

          {acao && (s.status === "APROVADA" || s.status === "RESSALVAS") && (
            <PainelAcao
              titulo="Envie o alvará e a ART/RRT de execução"
              subtitulo={`Projeto ${s.status === "RESSALVAS" ? "aprovado com ressalvas" : "aprovado"} pela CAPE. Para liberar o início da obra, anexe os dois documentos.`}
            >
              {s.status === "RESSALVAS" && pendencias.length > 0 && <ListaPendencias pendencias={pendencias} titulo="Ressalvas da CAPE" />}
              <EnviarAlvara solicitacaoId={s.id} recusa={s.alvaraRecusa} />
            </PainelAcao>
          )}

          {!acao && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "#F6F7F8", border: "1px solid #E1E5E9", borderRadius: 4, padding: "13px 15px" }}>
              <div style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#4A5563" }}>
                {podeAgir && !["EXECUCAO", "CONCLUIDA", "REPROVADA"].includes(s.status) ? "Nada a fazer agora — aguardando a CAPE" : "Situação"}
              </div>
              <div style={{ fontSize: 13, color: "#231F20", lineHeight: 1.5 }}>{AGUARDANDO[s.status]}</div>
              {(s.status === "ENVIADA" || s.status === "ANALISE") && (
                <div style={{ fontSize: 12, color: "#4A5563" }}>Prazo de análise: {prazoAnaliseTexto(s)}</div>
              )}
              {s.status === "ALVARA_CONFERENCIA" && (
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5 }}>
                  <a href={`/api/alvara/${s.id}`} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                    Alvará enviado
                  </a>
                  {s.alvaraArtCaminho && (
                    <a href={`/api/alvara/${s.id}?arquivo=art`} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                      ART/RRT de execução enviada
                    </a>
                  )}
                </div>
              )}
              {s.status === "REPROVADA" && pendencias.length > 0 && <ListaPendencias pendencias={pendencias} />}
            </div>
          )}

          {irregAbertas.length > 0 && <Irregularidades titulo="Irregularidades em aberto na obra" itens={irregAbertas} destaque />}

          {/* ---------- Consulta, recolhida ---------- */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Recolhivel titulo="Detalhes da solicitação">
              <div style={{ fontSize: 12.5, color: "#3B4653", lineHeight: 1.5 }}>{s.descricao}</div>
              <span style={{ fontSize: 11.5, color: "#7A7472" }} title="Só os reenvios da etapa de análise técnica (check-list) são contados.">
                Reenvios na análise técnica: {s.reenvios} de {s.lote.empreendimento.reenviosSemTaxa} sem nova taxa
              </span>
              {podeAgir && (
                <SenhaProprietario
                  protocolo={s.protocolo}
                  senha={senhaAcompanhamento ?? null}
                  url={urlAcompanhamento}
                  email={s.proprietarioEmail}
                  enviadoEm={s.acompanhamentoEnviadoEm}
                />
              )}
            </Recolhivel>
            {devolutivasAntigas.length > 0 && (
              <Recolhivel titulo={`Apontamentos da CAPE (${devolutivasAntigas.length})`}>
                {devolutivasAntigas.map((d) => (
                  <Devolutiva key={d.id} d={d} />
                ))}
              </Recolhivel>
            )}
            {irregResolvidas.length > 0 && (
              <Recolhivel titulo={`Irregularidades regularizadas (${irregResolvidas.length})`}>
                <Irregularidades itens={irregResolvidas} />
              </Recolhivel>
            )}
            <VersoesAnteriores versoes={s.arquivos} />
            <Recolhivel titulo={`Histórico (${s.historico.length})`}>
              {s.historico.length === 0 ? (
                <div style={{ fontSize: 12, color: "#7A7472" }}>Sem movimentações registradas ainda.</div>
              ) : (
                s.historico.map((h) => (
                  <div key={h.id} style={{ display: "grid", gridTemplateColumns: "12px 1fr", gap: 10 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: h.cor, marginTop: 5 }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingBottom: 6 }}>
                      <div style={{ fontSize: 12.5, lineHeight: 1.4, whiteSpace: "pre-line" }}>{h.texto}</div>
                      <div style={{ fontSize: 11, color: "#7A7472", fontFamily: "var(--font-mono)" }}>
                        {formatDateTime(h.createdAt)}
                        {h.autor?.name ? ` · ${h.autor.name}` : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </Recolhivel>
          </div>
        </div>
      )}
    </section>
  );
}

function PainelAcao({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "2px solid #E01B22", borderRadius: 6, background: "#FFFBFA", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#E01B22", fontWeight: 700 }}>Próxima ação</span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, lineHeight: 1.15 }}>{titulo}</span>
        {subtitulo && <span style={{ fontSize: 12.5, color: "#4A5563", lineHeight: 1.45 }}>{subtitulo}</span>}
      </div>
      {children}
    </div>
  );
}

function Passo({ n, titulo, feito, children }: { n: number; titulo: string; feito: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "26px minmax(0,1fr)", gap: 10 }}>
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontWeight: 700,
          background: feito ? "#24603A" : "#E01B22",
          color: "#fff",
        }}
      >
        {feito ? "✓" : n}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "#231F20", paddingTop: 3 }}>{titulo}</span>
        {children}
      </div>
    </div>
  );
}

function Recolhivel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <details style={{ border: "1px solid #EDE9E1", borderRadius: 4, background: "#FAF9F6", padding: "9px 12px" }}>
      <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#4A5563" }}>{titulo}</summary>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 10 }}>{children}</div>
    </details>
  );
}

function ListaPendencias({ pendencias, titulo }: { pendencias: { titulo: string; referencia: string | null; texto: string }[]; titulo?: string }) {
  return (
    <div style={{ background: "#FDF8EE", border: "1px solid #E8D7B4", borderRadius: 4, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
      {titulo && <div style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#8A5210" }}>{titulo}</div>}
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
  );
}

function Devolutiva({ d }: { d: PedidoCard["devolutivas"][number] }) {
  return (
    <div style={{ background: "#F4F6F8", border: "1px solid #D5DCE2", borderRadius: 4, padding: "11px 13px", display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "#7A7472" }}>Comentários da CAPE · {formatDateTime(d.createdAt)}</div>
      {d.comentario && <div style={{ fontSize: 12.5, color: "#3B4653", lineHeight: 1.5, whiteSpace: "pre-line" }}>{d.comentario}</div>}
      {d.arquivoNome && (
        <a href={`/api/devolutivas/${d.id}`} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 600, color: "#E01B22" }}>
          Baixar arquivo com os apontamentos — {d.arquivoNome}
        </a>
      )}
    </div>
  );
}

function Irregularidades({ itens, titulo, destaque }: { itens: PedidoCard["irregularidades"]; titulo?: string; destaque?: boolean }) {
  return (
    <div
      style={{
        background: destaque ? "#FDF6F5" : "transparent",
        border: destaque ? "1px solid #E8C9C4" : 0,
        borderRadius: 4,
        padding: destaque ? "14px 16px" : 0,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {titulo && <div style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#8C2B22" }}>{titulo}</div>}
      {itens.map((irr) => (
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
  );
}

// Só informa: o acesso sai sozinho por e-mail no protocolo, e reenviar é com a CAPE.
function SenhaProprietario({
  protocolo,
  senha,
  url,
  email,
  enviadoEm,
}: {
  protocolo: string;
  senha: string | null;
  url: string;
  email: string | null;
  enviadoEm: Date | null;
}) {
  return (
    <div style={{ background: enviadoEm ? "#F6FAF7" : "#FDF8EE", border: `1px solid ${enviadoEm ? "#C6DAC9" : "#E8D7B4"}`, borderRadius: 4, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: enviadoEm ? "#24603A" : "#8A5210" }}>Acompanhamento do proprietário</div>
      <div style={{ fontSize: 12.5, color: "#3B4653", lineHeight: 1.5 }}>
        {enviadoEm && email ? (
          <>
            Protocolo e senha enviados automaticamente para <strong>{email}</strong> em {formatDateTime(enviadoEm)}, com cópia para você.
            O proprietário acompanha em{" "}
            <a href="/acompanhar" target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
              {url}
            </a>
            , sem conta e sem poder alterar nada.
          </>
        ) : (
          <>
            O e-mail automático com o acesso {email ? <>para <strong>{email}</strong> </> : ""}não foi enviado. A equipe CAPE pode
            reenviá-lo pela análise da solicitação.
          </>
        )}
      </div>
      {senha && (
        <div style={{ fontSize: 11.5, color: "#7A7472", fontFamily: "var(--font-mono)" }}>
          protocolo {protocolo} · senha {senha}
        </div>
      )}
    </div>
  );
}

function EnviarComplementacao({ solicitacaoId, faltando, semTroca }: { solicitacaoId: string; faltando: string[]; semTroca: boolean }) {
  const [state, formAction, pending] = useActionState<ReenvioState>(() => reenviarComplementacaoAction(solicitacaoId), null);
  const bloqueio =
    faltando.length > 0
      ? `Falta enviar: ${faltando.join(", ")}. A complementação só pode ser enviada com todos os documentos obrigatórios.`
      : semTroca
        ? "Substitua pelo menos um dos arquivos apontados (passo 2) para liberar o envio."
        : null;
  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 7, alignItems: "flex-start" }}>
      {bloqueio && <div style={{ fontSize: 12.5, color: "#8A5210", lineHeight: 1.45 }}>{bloqueio}</div>}
      <button
        type="submit"
        disabled={!!bloqueio || pending}
        style={{
          border: `1px solid ${bloqueio ? "#DDD8CE" : "#E01B22"}`,
          background: bloqueio ? "#EDE9E1" : "#E01B22",
          color: bloqueio ? "#8B939C" : "#fff",
          borderRadius: 4,
          padding: "10px 18px",
          fontSize: 13,
          fontWeight: 600,
          cursor: bloqueio ? "not-allowed" : pending ? "wait" : "pointer",
        }}
      >
        {pending ? "Enviando…" : "Enviar complementação"}
      </button>
      {state?.error && <div style={{ fontSize: 12, color: "#8C2B22" }}>{state.error}</div>}
    </form>
  );
}

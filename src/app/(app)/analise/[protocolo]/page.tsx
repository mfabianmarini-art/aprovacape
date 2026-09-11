import { notFound } from "next/navigation";
import { requireRole } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { getAnalise } from "@/lib/queries/analise";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { DOC_LABEL, DOC_ORDER, TIPO_LABEL, IRREGULARIDADE_LABEL, formatBRL, formatDate, formatDateTime } from "@/lib/status";
import {
  toggleDocumentoAction,
  devolverDocumentacaoAction,
  decidirItemAction,
  emitirParecerAction,
  togglePagoAction,
  salvarObservacaoDocumentoAction,
  salvarObservacaoItemAction,
  aceitarAlvaraAction,
  recusarAlvaraAction,
  regularizarIrregularidadeAction,
  concluirObraAction,
} from "@/lib/actions/analise-actions";
import { ObservacaoField } from "@/components/ObservacaoField";
import { IrregularidadeBotao } from "@/components/IrregularidadeForm";

const EDITAVEL = new Set(["ENVIADA", "ANALISE", "COMPLEMENTO"]);

export default async function AnalisePage({ params }: { params: Promise<{ protocolo: string }> }) {
  const { protocolo } = await params;
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const [user, result] = await Promise.all([
    getUserDisplay(session.user.id, session.user.role),
    getAnalise(protocolo),
  ]);
  if (!result) notFound();
  const { solicitacao: sol, categorias } = result;

  const podeEditar = EDITAVEL.has(sol.status);
  // Já devolvida: a bola está com o proprietário até o reenvio, e devolver de novo
  // não muda nada — a action recusa. O botão reflete isso em vez de aceitar cliques.
  const aguardandoProprietario = sol.status === "COMPLEMENTO";
  // Irregularidade e conclusão são do acompanhamento da obra, que começa quando ela é
  // liberada; antes disso não há obra no lote para fiscalizar.
  const podeAcompanharObra = sol.status === "EXECUCAO" || sol.status === "CONCLUIDA";
  const irregularidadesAbertas = sol.irregularidades.filter((i) => !i.regularizadaEm).length;
  const nOk = DOC_ORDER.filter((t) => sol.documentos.find((d) => d.tipo === t)?.validado).length;
  const allDocs = nOk === DOC_ORDER.length;
  // Com tudo validado não há o que complementar: a devolução aqui é da conferência
  // documental, e o caminho passa a ser o check-list.
  const devolverBloqueado = aguardandoProprietario || allDocs;

  const totalItens = categorias.reduce((a, c) => a + c.itens.length, 0);
  // Conta decisões, não linhas: ao devolver o parecer os itens reprovados voltam a
  // PENDENTE mas o ChecklistResultado continua existindo. Contar linhas dava o
  // check-list por completo com itens ainda indecididos, liberando "Aprovar projeto".
  const aprovados = sol.resultados.filter((r) => r.status === "APROVADO").length;
  const reprovados = sol.resultados.filter((r) => r.status === "REPROVADO").length;
  const avaliados = aprovados + reprovados;

  let veredito: string;
  let vereditoCor: string;
  let emitirLabel: string;
  let emitirBg: string;
  let emitirFg: string;
  let podeEmitir = false;
  if (!allDocs) {
    veredito = "Check-list bloqueado até a validação de toda a documentação.";
    vereditoCor = "#8A5210";
    emitirLabel = "Emitir parecer";
    emitirBg = "#EDE9E1";
    emitirFg = "#8B939C";
  } else if (totalItens === 0) {
    veredito = "Este empreendimento ainda não tem itens de check-list cadastrados. Configure o check-list antes de emitir parecer.";
    vereditoCor = "#8A5210";
    emitirLabel = "Emitir parecer";
    emitirBg = "#EDE9E1";
    emitirFg = "#8B939C";
  } else if (avaliados < totalItens) {
    veredito = `${totalItens - avaliados} itens ainda sem decisão. O parecer só é emitido com o check-list completo.`;
    vereditoCor = "#4A5563";
    emitirLabel = "Emitir parecer";
    emitirBg = "#EDE9E1";
    emitirFg = "#8B939C";
  } else if (reprovados > 0) {
    veredito = `${reprovados} itens reprovados. O proprietário e o RT recebem apenas esses itens para correção; na reanálise o check-list reabre somente eles.`;
    vereditoCor = "#8C2B22";
    emitirLabel = `Devolver com ${reprovados} pendências`;
    emitirBg = "#8C2B22";
    emitirFg = "#FFFFFF";
    podeEmitir = true;
  } else {
    veredito = "Todos os itens aprovados. O parecer não substitui a aprovação da Prefeitura nem o alvará de execução.";
    vereditoCor = "#24603A";
    emitirLabel = "Aprovar projeto";
    emitirBg = "#24603A";
    emitirFg = "#FFFFFF";
    podeEmitir = true;
  }

  const selCampos: [string, string][] = [
    ["Empreendimento", sol.lote.empreendimento.nome],
    ["Lote", `${sol.lote.quadra.nome} L${sol.lote.numero}`],
    ["Proprietário", sol.lote.proprietario?.name ?? "—"],
    ["Responsável técnico", `${sol.responsavelTecnicoNome} · ${sol.responsavelTecnicoRegistro}`],
    ["Tipo de obra", TIPO_LABEL[sol.tipo]],
    ["Protocolado em", formatDate(sol.createdAt)],
    ["Prazo de análise", `${sol.prazoDias} dias corridos`],
    ["Reenvios", `${sol.reenvios} / ${sol.lote.empreendimento.reenviosSemTaxa} (${sol.lote.empreendimento.reenviosSemTaxa + 1}º exige nova taxa)`],
  ];

  return (
    <>
      <ScreenHeader crumb={`CAPE · ${sol.protocolo}`} title="Análise de projeto" {...user} />
      <ScreenBody>
        {podeAcompanharObra && (
          <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderTop: `3px solid ${irregularidadesAbertas > 0 ? "#8C2B22" : "#3B3486"}`, borderRadius: 4, padding: 18, display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
                Acompanhamento da obra
              </div>
              <div style={{ fontSize: 11.5, color: irregularidadesAbertas > 0 ? "#8C2B22" : "#6B7480", fontFamily: "var(--font-mono)" }}>
                {irregularidadesAbertas > 0
                  ? `${irregularidadesAbertas} irregularidade(s) em aberto`
                  : "nenhuma irregularidade em aberto"}
              </div>
            </div>

            {sol.irregularidades.map((irr) => (
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

            <IrregularidadeBotao solicitacaoId={sol.id} />

            {sol.status === "EXECUCAO" && (
              <div style={{ borderTop: "1px solid #EDE9E1", paddingTop: 13, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <form action={irregularidadesAbertas > 0 ? undefined : concluirObraAction.bind(null, sol.id)}>
                  <button
                    type="submit"
                    disabled={irregularidadesAbertas > 0}
                    title={irregularidadesAbertas > 0 ? "Regularize as pendências antes de concluir." : undefined}
                    style={{
                      border: `1px solid ${irregularidadesAbertas > 0 ? "#DDD8CE" : "#0E1B24"}`,
                      background: irregularidadesAbertas > 0 ? "#fff" : "#0E1B24",
                      color: irregularidadesAbertas > 0 ? "#B0AAA0" : "#fff",
                      borderRadius: 4,
                      padding: "9px 15px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: irregularidadesAbertas > 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    Obra concluída — arquivar solicitação
                  </button>
                </form>
                <span style={{ fontSize: 11.5, color: "#6B7480" }}>
                  {irregularidadesAbertas > 0
                    ? "Há irregularidade em aberto: regularize antes de encerrar."
                    : "Encerra o protocolo. O histórico e os documentos continuam consultáveis."}
                </span>
              </div>
            )}

            {sol.status === "CONCLUIDA" && (
              <div style={{ fontSize: 12.5, color: "#4A5563", borderTop: "1px solid #EDE9E1", paddingTop: 13 }}>
                Solicitação arquivada{sol.concluidaEm ? ` em ${formatDateTime(sol.concluidaEm)}` : ""}.
              </div>
            )}
          </section>
        )}

        {sol.status === "ALVARA_CONFERENCIA" && (
          <section style={{ background: "#fff", border: "1px solid #D9D1EC", borderTop: "3px solid #4B3A7A", borderRadius: 4, padding: 18, display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
              Alvará de execução em conferência
            </div>
            <div style={{ fontSize: 12.5, color: "#4A5563", lineHeight: 1.5 }}>
              O proprietário anexou o alvará da Prefeitura{sol.alvaraEnviadoEm ? ` em ${formatDateTime(sol.alvaraEnviadoEm)}` : ""}.
              A obra só é liberada depois que a CAPE aceitar o documento.
            </div>
            <a
              href={`/api/alvara/${sol.id}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13, fontWeight: 600, color: "#4B3A7A" }}
            >
              Abrir {sol.alvaraNome ?? "alvará"}
            </a>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "end" }}>
              <form action={recusarAlvaraAction.bind(null, sol.id)} style={{ display: "flex", gap: 9, alignItems: "flex-end", flexWrap: "wrap" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 260 }}>
                  <span style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#6B7480" }}>
                    Motivo, se for recusar
                  </span>
                  <input
                    name="motivo"
                    maxLength={1000}
                    placeholder="Ex.: alvará de outro lote, ou fora da validade."
                    style={{ border: "1px solid #DDD8CE", borderRadius: 4, padding: "9px 11px", fontSize: 12.5 }}
                  />
                </label>
                <button
                  type="submit"
                  style={{ border: "1px solid #8C2B22", background: "#fff", color: "#8C2B22", borderRadius: 4, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                >
                  Recusar alvará
                </button>
              </form>
              <form action={aceitarAlvaraAction.bind(null, sol.id)}>
                <button
                  type="submit"
                  style={{ border: "1px solid #3B3486", background: "#3B3486", color: "#fff", borderRadius: 4, padding: "9px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                >
                  Aceitar e liberar início da obra
                </button>
              </form>
            </div>
          </section>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 20, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Step 1 — Validação documental */}
            <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "15px 18px", borderBottom: "1px solid #EDE9E1", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: allDocs ? "#24603A" : "#B4711A",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    1
                  </span>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
                      Validação documental
                    </div>
                    <div style={{ fontSize: 11.5, color: "#6B7480" }}>
                      {sol.reenvios > 0 || nOk > 0
                        ? "O que você já validou permanece validado entre as rodadas — só os arquivos substituídos voltam para conferência."
                        : "Conferência manual: o documento existe, está legível, assinado e pertence a este lote."}
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#4A5563" }}>
                  {nOk} / {DOC_ORDER.length} validados
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {DOC_ORDER.map((tipo) => {
                  const doc = sol.documentos.find((d) => d.tipo === tipo);
                  const ok = !!doc?.validado;
                  const action = podeEditar && doc ? toggleDocumentoAction.bind(null, sol.id, tipo) : null;
                  return (
                    <div
                      key={tipo}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "26px 1fr 132px",
                        alignItems: "center",
                        gap: 12,
                        rowGap: 10,
                        padding: "13px 18px",
                        borderBottom: "1px solid #F1EEE7",
                        background: ok ? "#FBFCFA" : "#FFFFFF",
                      }}
                    >
                      {action ? (
                        <form action={action}>
                          <button
                            type="submit"
                            aria-label={`Marcar ${DOC_LABEL[tipo].nome} como ${ok ? "não validado" : "validado"}`}
                            style={{
                              all: "unset",
                              cursor: "pointer",
                              width: 19,
                              height: 19,
                              borderRadius: 3,
                              border: `1.5px solid ${ok ? "#24603A" : "#C9C2B4"}`,
                              background: ok ? "#24603A" : "#FFFFFF",
                              color: "#fff",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {ok ? "✓" : ""}
                          </button>
                        </form>
                      ) : (
                        <span
                          style={{
                            width: 19,
                            height: 19,
                            borderRadius: 3,
                            border: `1.5px solid ${ok ? "#24603A" : "#C9C2B4"}`,
                            background: ok ? "#24603A" : "#FFFFFF",
                            color: "#fff",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {ok ? "✓" : ""}
                        </span>
                      )}
                      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                          {DOC_LABEL[tipo].nome}
                          {doc && !ok && sol.reenvios > 0 && (
                            <span
                              style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "#8A5210", background: "#F6E3C4", borderRadius: 3, padding: "2px 6px" }}
                            >
                              reanalisar
                            </span>
                          )}
                        </span>
                        <span style={{ fontSize: 11.5, color: "#6B7480", fontFamily: "var(--font-mono)" }}>
                          {doc ? `${doc.nomeArquivo} · enviado em ${formatDateTime(doc.uploadedAt)}` : "Ainda não enviado"}
                        </span>
                      </span>
                      <span style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                        {doc && (
                          <a href={`/api/files/${doc.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 600 }}>
                            abrir
                          </a>
                        )}
                        <span style={{ fontSize: 11.5, fontWeight: 600, fontFamily: "var(--font-mono)", color: ok ? "#24603A" : "#8A5210" }}>
                          {doc ? (ok ? "validado" : "validar") : "pendente"}
                        </span>
                      </span>
                      {doc && !ok && (
                        <div style={{ gridColumn: "2 / -1" }}>
                          {podeEditar ? (
                            <ObservacaoField
                              defaultValue={doc.observacao ?? ""}
                              placeholder="O que impede a validação deste documento? Ex.: prancha sem assinatura do RT."
                              onSave={salvarObservacaoDocumentoAction.bind(null, sol.id, tipo)}
                            />
                          ) : (
                            doc.observacao && (
                              <div style={{ fontSize: 12.5, color: "#6B4A11", lineHeight: 1.45 }}>{doc.observacao}</div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px 18px", flexWrap: "wrap" }}>
                <div style={{ fontSize: 12.5, color: "#4A5563", maxWidth: "60ch", lineHeight: 1.45 }}>
                  {aguardandoProprietario
                    ? "Devolvida. O botão volta a ficar disponível quando o proprietário reenviar a documentação."
                    : allDocs
                      ? "Documentação completa e pertinente. Check-list liberado."
                      : "Marque cada documento conferido. Se algum for impertinente ou ilegível, devolva a solicitação — o proprietário e o RT são notificados com a lista do que falta."}
                </div>
                {podeEditar && (
                  <form action={devolverBloqueado ? undefined : devolverDocumentacaoAction.bind(null, sol.id)}>
                    <button
                      type="submit"
                      disabled={devolverBloqueado}
                      title={
                        aguardandoProprietario
                          ? "Já devolvida — aguardando o reenvio do proprietário."
                          : allDocs
                            ? "Todos os documentos foram validados: não há o que complementar."
                            : undefined
                      }
                      style={{
                        border: `1px solid ${devolverBloqueado ? "#DDD8CE" : "#8C2B22"}`,
                        background: "#fff",
                        color: devolverBloqueado ? "#B0AAA0" : "#8C2B22",
                        borderRadius: 4,
                        padding: "9px 14px",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: devolverBloqueado ? "not-allowed" : "pointer",
                      }}
                    >
                      {aguardandoProprietario ? "Aguardando reenvio" : "Devolver para complementação"}
                    </button>
                  </form>
                )}
              </div>
            </section>

            {/* Step 2 — Check-list técnico */}
            <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, opacity: allDocs ? 1 : 0.55 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "15px 18px", borderBottom: "1px solid #EDE9E1", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: allDocs ? "#12455E" : "#EDE9E1",
                      color: allDocs ? "#fff" : "#8B939C",
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    2
                  </span>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
                      Check-list técnico
                    </div>
                    <div style={{ fontSize: 11.5, color: "#6B7480" }}>
                      {allDocs ? "Itens aprovados na análise anterior aparecem travados e não são reavaliados." : "Liberado após a validação documental."}
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#4A5563" }}>
                  {avaliados} / {totalItens} itens
                </div>
              </div>

              {categorias.map((c) => {
                const done = c.itens.filter((i) => sol.resultados.find((r) => r.itemId === i.id)).length;
                const travados = c.itens.filter((i) => sol.resultados.find((r) => r.itemId === i.id)?.travado).length;
                return (
                  <div key={c.id} style={{ borderBottom: "1px solid #EDE9E1" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 18px", background: "#FAF9F6" }}>
                      <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#12455E", fontWeight: 600 }}>{c.nome}</div>
                      <div style={{ fontSize: 11, color: "#6B7480", fontFamily: "var(--font-mono)" }}>
                        {done}/{c.itens.length}
                        {travados ? ` · ${travados} travados` : ""}
                      </div>
                    </div>
                    {c.itens.map((item) => {
                      const resultado = sol.resultados.find((r) => r.itemId === item.id);
                      const travado = !!resultado?.travado;
                      const ativo = podeEditar && allDocs && !travado;
                      const est = resultado?.status ?? "PENDENTE";
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 186px",
                            alignItems: "center",
                            gap: 14,
                            rowGap: 10,
                            padding: "12px 18px",
                            borderTop: "1px solid #F5F2EC",
                            background: travado ? "#FBFAF7" : est === "REPROVADO" ? "#FDF6F5" : "#FFFFFF",
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 500, color: travado ? "#7A828C" : "#0E1B24" }}>{item.texto}</div>
                            <div style={{ fontSize: 11.5, color: "#6B7480" }}>{item.referencia}</div>
                          </div>
                          <div style={{ display: "flex", gap: 7, justifyContent: "flex-end" }}>
                            <form action={ativo ? decidirItemAction.bind(null, sol.id, item.id, "APROVADO") : undefined}>
                              <button
                                type="submit"
                                disabled={!ativo}
                                aria-label={`Aprovar item: ${item.texto}`}
                                style={{
                                  border: `1px solid ${est === "APROVADO" ? "#24603A" : "#DDD8CE"}`,
                                  background: est === "APROVADO" ? "#24603A" : "#FFFFFF",
                                  color: est === "APROVADO" ? "#FFFFFF" : "#4A5563",
                                  borderRadius: 4,
                                  padding: "7px 11px",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: ativo ? "pointer" : "not-allowed",
                                }}
                              >
                                Aprovado
                              </button>
                            </form>
                            <form action={ativo ? decidirItemAction.bind(null, sol.id, item.id, "REPROVADO") : undefined}>
                              <button
                                type="submit"
                                disabled={!ativo}
                                aria-label={`Reprovar item: ${item.texto}`}
                                style={{
                                  border: `1px solid ${est === "REPROVADO" ? "#8C2B22" : "#DDD8CE"}`,
                                  background: est === "REPROVADO" ? "#8C2B22" : "#FFFFFF",
                                  color: est === "REPROVADO" ? "#FFFFFF" : "#4A5563",
                                  borderRadius: 4,
                                  padding: "7px 11px",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: ativo ? "pointer" : "not-allowed",
                                }}
                              >
                                Reprovado
                              </button>
                            </form>
                          </div>
                          {est === "REPROVADO" && (
                            <div style={{ gridColumn: "1 / -1" }}>
                              {ativo ? (
                                <ObservacaoField
                                  defaultValue={resultado?.observacao ?? ""}
                                  placeholder="O que não atendeu a norma e o que precisa ser corrigido para este item."
                                  onSave={salvarObservacaoItemAction.bind(null, sol.id, item.id)}
                                />
                              ) : (
                                resultado?.observacao && (
                                  <div style={{ fontSize: 12.5, color: "#6B4A11", lineHeight: 1.45 }}>{resultado.observacao}</div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 18px", flexWrap: "wrap" }}>
                <div style={{ fontSize: 12.5, lineHeight: 1.45, maxWidth: "62ch", color: vereditoCor }}>{veredito}</div>
                <div style={{ display: "flex", gap: 9 }}>
                  <form action={podeEditar && podeEmitir ? emitirParecerAction.bind(null, sol.id) : undefined}>
                    <button
                      type="submit"
                      disabled={!podeEditar || !podeEmitir}
                      style={{
                        border: "1px solid #12455E",
                        background: emitirBg,
                        color: emitirFg,
                        borderRadius: 4,
                        padding: "10px 16px",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: podeEditar && podeEmitir ? "pointer" : "not-allowed",
                      }}
                    >
                      {emitirLabel}
                    </button>
                  </form>
                </div>
              </div>
            </section>
          </div>

          <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: "16px 17px", display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>{sol.protocolo}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {selCampos.map(([k, v]) => (
                  <div key={k} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <div style={{ fontSize: 10.5, letterSpacing: ".13em", textTransform: "uppercase", color: "#6B7480" }}>{k}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.35 }}>{v}</div>
                  </div>
                ))}
              </div>
            </section>
            <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: "16px 17px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#6B7480" }}>Taxa de análise</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 600 }}>{formatBRL(sol.lote.empreendimento.taxaAnaliseCent)}</div>
              <div style={{ fontSize: 11.5, color: "#4A5563", lineHeight: 1.45 }}>
                Lote único. Lotes contíguos do mesmo proprietário multiplicam a taxa pelo número de lotes originais da planta.
              </div>
              <form action={togglePagoAction.bind(null, sol.id)}>
                <button
                  type="submit"
                  style={{
                    border: `1px solid ${sol.pago ? "#C6DAC9" : "#DDD8CE"}`,
                    background: sol.pago ? "#D8E9DA" : "#FFFFFF",
                    color: sol.pago ? "#24603A" : "#4A5563",
                    borderRadius: 4,
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {sol.pago ? "Taxa registrada como paga" : "Registrar pagamento manualmente"}
                </button>
              </form>
            </section>
            <section style={{ background: "#0B2E3F", color: "#fff", borderRadius: 4, padding: "16px 17px", display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#8FB0BF" }}>Histórico</div>
              {sol.historico.map((h) => (
                <div key={h.id} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: h.cor, marginTop: 6, flex: "none" }} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ fontSize: 12.5, lineHeight: 1.35 }}>{h.texto}</span>
                    <span style={{ fontSize: 11, color: "#8FB0BF", fontFamily: "var(--font-mono)" }}>{formatDateTime(h.createdAt)}</span>
                  </span>
                </div>
              ))}
            </section>
          </aside>
        </div>
      </ScreenBody>
    </>
  );
}

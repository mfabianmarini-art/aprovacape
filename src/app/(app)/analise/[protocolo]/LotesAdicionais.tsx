import { formatarCpf } from "@/lib/cpf";
import { formatDateTime } from "@/lib/status";
import { referenciaDoLote, titularidadeEntreLotes, type LoteParaConferencia } from "@/lib/conferencia-vinculo";
import { aprovarLoteAdicionalAction, desvincularLoteAdicionalAction, recusarLoteAdicionalAction } from "@/lib/actions/analise-actions";
import type { getAnalise } from "@/lib/queries/analise";

type Sol = NonNullable<Awaited<ReturnType<typeof getAnalise>>>["solicitacao"];

const STATUS: Record<string, { rotulo: string; cor: string; bg: string }> = {
  PENDENTE: { rotulo: "Aguardando conferência", cor: "#8A5210", bg: "#FBF5EA" },
  APROVADO: { rotulo: "Vinculado", cor: "#24603A", bg: "#EEF5EF" },
  RECUSADO: { rotulo: "Recusado", cor: "#8C2B22", bg: "#FDF6F5" },
};

function titular(ref: { nome: string; cpf: string } | null) {
  return ref ? `${ref.nome} · ${formatarCpf(ref.cpf)}` : "sem proprietário cadastrado";
}

// Projeto que abrange mais de um lote. Fica no topo da análise enquanto houver lote a
// conferir: o analista confere a titularidade de cada um contra o lote principal e
// aprova ou recusa o vínculo do RT.
export function LotesAdicionais({ sol }: { sol: Sol }) {
  const pendentes = sol.lotesAdicionais.filter((a) => a.status === "PENDENTE").length;
  const principal: LoteParaConferencia = sol.lote;
  const rotuloPrincipal = `${sol.lote.quadra.nome} L${sol.lote.numero}`;
  const podeDecidir = sol.status !== "RASCUNHO";
  // O que sobra do projeto: um lote recusado pode deixar os demais sem divisa entre si.
  const restantes = sol.lotesAdicionais.filter((a) => a.status !== "RECUSADO");
  const numeros = [sol.lote.numero, ...restantes.map((a) => a.lote.numero)];
  const conferirContiguidade = pendentes > 0 || (restantes.length > 0 && restantes.length < sol.lotesAdicionais.length);
  const parecerEmitido = ["APROVADA", "RESSALVAS", "ALVARA_CONFERENCIA", "EXECUCAO", "CONCLUIDA"].includes(sol.status);

  return (
    <section
      style={{
        background: "#fff",
        border: `1px solid ${pendentes ? "#EAD9BC" : "#DDD8CE"}`,
        borderTop: `3px solid ${pendentes ? "#B4711A" : "#24603A"}`,
        borderRadius: 4,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 13,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
          Projeto em {restantes.length + 1} {restantes.length ? "lotes" : "lote"}
        </div>
        <div style={{ fontSize: 11.5, color: pendentes ? "#8A5210" : "#7A7472", fontFamily: "var(--font-mono)" }}>
          {pendentes ? `${pendentes} lote(s) a conferir` : "todos os lotes conferidos"}
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "#4A5563", lineHeight: 1.5 }}>
        Lote principal: <strong>{rotuloPrincipal}</strong>, já vinculado ao RT
        {sol.lote.rt ? ` ${sol.lote.rt.name}` : ""} · proprietário {titular(referenciaDoLote(principal))}.
        {pendentes > 0 &&
          " Confira que os demais lotes são do mesmo proprietário e aprove ou recuse cada vínculo. O projeto só pode ser aprovado depois disso."}
      </div>

      {conferirContiguidade && (
        <div style={{ fontSize: 12.5, color: "#8A5210", background: "#FBF5EA", border: "1px solid #EAD9BC", borderRadius: 4, padding: "10px 12px", lineHeight: 1.5 }}>
          <strong>Contiguidade a conferir:</strong> o sistema não sabe quais lotes fazem divisa, e a numeração pode ter saltos.
          Confira na{" "}
          <a href={`/resumo?emp=${sol.lote.empreendimentoId}`} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: "#8A5210" }}>
            planta do loteamento
          </a>{" "}
          se {numeros.map((n) => `L${n}`).join(", ")} são contíguos.
          {pendentes > 0 && " Só é possível aprovar o vínculo confirmando que o lote faz divisa com o projeto."}
        </div>
      )}

      {sol.lotesAdicionais.map((a) => {
        const conf = titularidadeEntreLotes(principal, a.lote);
        // Quadras são separadas por rua: lote de outra quadra nunca é contíguo. Só aparece
        // em pedido anterior à regra; hoje o RT nem consegue indicar.
        const outraQuadra = a.lote.quadraId !== sol.lote.quadraId;
        const bloqueado = conf.situacao === "divergente" || outraQuadra;
        const st = STATUS[a.status];
        const rotulo = `${a.lote.quadra.nome} L${a.lote.numero}`;
        // Outro profissional no lote: aprovar o substitui.
        const outroRT = a.lote.rt && a.lote.rt.id !== sol.lote.rt?.id ? a.lote.rt.name : null;
        return (
          <div
            key={a.id}
            style={{ border: "1px solid #EDE9E1", background: st.bg, borderRadius: 4, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{rotulo}</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: st.cor }}>
                {st.rotulo}
                {a.revisadoEm && (
                  <span style={{ fontWeight: 400, color: "#7A7472", fontFamily: "var(--font-mono)" }}>
                    {" "}· {formatDateTime(a.revisadoEm)}
                    {a.revisadoPor ? ` · ${a.revisadoPor.name}` : ""}
                  </span>
                )}
                {a.status === "APROVADO" && !a.revisadoEm && (
                  <span style={{ fontWeight: 400, color: "#7A7472" }}> · já era do RT no protocolo</span>
                )}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "#3B4653" }}>Proprietário cadastrado: {titular(conf.adicional)}</div>
            {conf.situacao === "divergente" && (
              <div style={{ fontSize: 12, color: "#8C2B22", lineHeight: 1.45 }}>
                <strong>Proprietário diferente do lote principal</strong> ({titular(conf.principal)}). Recuse o vínculo, ou
                atualize o proprietário no cadastro do lote, em Empreendimentos, se a matrícula mostrar outro dono.
              </div>
            )}
            {conf.situacao === "sem-referencia" && a.status === "PENDENTE" && (
              <div style={{ fontSize: 12, color: "#8A5210", lineHeight: 1.45 }}>
                Sem proprietário cadastrado para comparar — confira pela matrícula, se anexada, ou recuse indicando o que falta.
              </div>
            )}
            {conf.situacao === "confere" && a.status === "PENDENTE" && (
              <div style={{ fontSize: 12, color: "#24603A" }}>Mesmo proprietário do lote principal.</div>
            )}
            {a.status === "PENDENTE" && outroRT && (
              <div style={{ fontSize: 12, color: "#8C2B22", lineHeight: 1.45 }}>
                Este lote já tem RT: <strong>{outroRT}</strong>. Aprovar substitui esse vínculo.
              </div>
            )}
            {outraQuadra && a.status !== "RECUSADO" && (
              <div style={{ fontSize: 12, color: "#8C2B22", lineHeight: 1.45 }}>
                <strong>Outra quadra:</strong> este lote não é contíguo ao lote principal ({sol.lote.quadra.nome}). Recuse o vínculo.
              </div>
            )}
            {a.status === "RECUSADO" && a.motivoRecusa && (
              <div style={{ fontSize: 12, color: "#8C2B22", whiteSpace: "pre-line" }}>Motivo: {a.motivoRecusa}</div>
            )}
            {a.status === "PENDENTE" && podeDecidir && (
              <div style={{ display: "flex", gap: 9, alignItems: "flex-end", flexWrap: "wrap" }}>
                <form action={recusarLoteAdicionalAction.bind(null, a.id)} style={{ display: "flex", gap: 9, alignItems: "flex-end", flexWrap: "wrap", flex: 1 }}>
                  <input
                    name="motivo"
                    maxLength={1000}
                    aria-label={`Motivo da recusa de ${rotulo}`}
                    placeholder="Motivo, se for recusar (vai ao RT no histórico)"
                    style={{ flex: 1, minWidth: 220, border: "1px solid #DDD8CE", borderRadius: 4, padding: "8px 10px", fontSize: 12.5 }}
                  />
                  <button
                    type="submit"
                    style={{ border: "1px solid #8C2B22", background: "#fff", color: "#8C2B22", borderRadius: 4, padding: "8px 13px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                  >
                    Recusar vínculo
                  </button>
                </form>
                <form
                  action={bloqueado ? undefined : aprovarLoteAdicionalAction.bind(null, a.id)}
                  style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}
                >
                  {!bloqueado && (
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#3B4653", cursor: "pointer" }}>
                      <input type="checkbox" name="contiguidade" required />
                      Conferi na planta: faz divisa com o projeto
                    </label>
                  )}
                  <button
                    type="submit"
                    disabled={bloqueado}
                    title={
                      outraQuadra
                        ? "Lote de outra quadra não é contíguo ao lote principal."
                        : bloqueado
                          ? "Resolva a divergência de proprietário antes de aprovar."
                          : undefined
                    }
                    style={{
                      border: `1px solid ${bloqueado ? "#DDD8CE" : "#24603A"}`,
                      background: bloqueado ? "#fff" : "#24603A",
                      color: bloqueado ? "#B0AAA0" : "#fff",
                      borderRadius: 4,
                      padding: "8px 14px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: bloqueado ? "not-allowed" : "pointer",
                    }}
                  >
                    Aprovar vínculo
                  </button>
                </form>
              </div>
            )}
            {a.status === "APROVADO" && podeDecidir && (
              <details>
                <summary style={{ fontSize: 12, fontWeight: 600, color: "#8C2B22", cursor: "pointer" }}>Desvincular este lote</summary>
                <form action={desvincularLoteAdicionalAction.bind(null, a.id)} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: "#4A5563", lineHeight: 1.45 }}>
                    O lote sai deste projeto.{" "}
                    {a.rtAlterado === true
                      ? a.rtAnterior
                        ? `O RT do lote volta a ser ${a.rtAnterior.name}.`
                        : "O RT do projeto deixa de responder por este lote."
                      : a.rtAlterado === false
                        ? "O RT continua no lote, porque já respondia por ele antes da aprovação."
                        : ""}
                    {parecerEmitido && " A situação da solicitação não muda: o parecer já emitido continua valendo."}
                  </div>
                  {a.rtAlterado === null && (
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#3B4653", cursor: "pointer" }}>
                      <input type="checkbox" name="retirarRt" />
                      Retirar também o RT deste lote (esta aprovação não registrou se ele já respondia pelo lote)
                    </label>
                  )}
                  <div style={{ display: "flex", gap: 9, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <input
                      name="motivo"
                      required
                      pattern=".*\S.*"
                      maxLength={1000}
                      aria-label={`Motivo do desvínculo de ${rotulo}`}
                      placeholder="Motivo (vai ao RT no histórico)"
                      style={{ flex: 1, minWidth: 220, border: "1px solid #DDD8CE", borderRadius: 4, padding: "8px 10px", fontSize: 12.5 }}
                    />
                    <button
                      type="submit"
                      style={{ border: "1px solid #8C2B22", background: "#fff", color: "#8C2B22", borderRadius: 4, padding: "8px 13px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                    >
                      Confirmar desvínculo
                    </button>
                  </div>
                </form>
              </details>
            )}
          </div>
        );
      })}
    </section>
  );
}

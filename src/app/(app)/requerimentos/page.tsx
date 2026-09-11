import { requireRole } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { getMeusRequerimentos } from "@/lib/queries/requerimentos";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { STATUS_INFO, DOC_LABEL, formatDate } from "@/lib/status";
import { reenviarComplementacaoAction, enviarAlvaraAction } from "@/lib/actions/requerimento-actions";
import { SubstituirDocumentos } from "./SubstituirDocumentos";

const MENSAGEM_PADRAO: Record<string, string> = {
  ENVIADA: "Aguardando validação documental pela CAPE.",
  ANALISE: "Documentação validada. O projeto está em análise técnica pela CAPE.",
  APROVADA: "Projeto aprovado. Apresente o alvará de execução da Prefeitura para liberar o início da obra.",
  RESSALVAS: "Projeto aprovado com ressalvas. Apresente o alvará de execução da Prefeitura para liberar o início da obra.",
  REPROVADA: "Solicitação reprovada. Uma nova análise exige nova taxa.",
  EXECUCAO: "Obra em execução.",
  CONCLUIDA: "Solicitação concluída.",
};

export default async function RequerimentosPage() {
  const session = await requireRole("PROPRIETARIO", "RESPONSAVEL_TECNICO");
  const [user, pedidos] = await Promise.all([
    getUserDisplay(session.user.id, session.user.role),
    getMeusRequerimentos(session.user.id),
  ]);

  return (
    <>
      <ScreenHeader crumb="Meus lotes" title="Requerimentos" {...user} />
      <ScreenBody>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {pedidos.length === 0 && (
            <div style={{ fontSize: 13.5, color: "#6B7480" }}>Nenhuma solicitação enviada ainda.</div>
          )}
          {pedidos.map((s) => {
            const info = STATUS_INFO[s.status];
            const mensagem = s.status === "COMPLEMENTO" || s.status === "REPROVADA" ? s.historico[0]?.texto ?? MENSAGEM_PADRAO[s.status] : MENSAGEM_PADRAO[s.status];
            const pendencias = [
              ...s.documentos
                .filter((d) => d.observacao)
                .map((d) => ({
                  titulo: DOC_LABEL[d.tipo].nome,
                  referencia: null as string | null,
                  texto: d.observacao!,
                })),
              ...s.resultados.map((r) => ({
                titulo: r.item.texto,
                referencia: r.item.referencia,
                texto: r.observacao!,
              })),
            ];
            const etapas = [
              { titulo: "Solicitação enviada", data: formatDate(s.createdAt), cor: "#24603A" },
              {
                titulo: "Validação documental",
                data: s.status === "ENVIADA" ? "em andamento" : formatDate(s.updatedAt),
                cor: "#24603A",
              },
              {
                titulo: "Análise técnica (check-list)",
                data: s.status === "ANALISE" ? "em andamento" : s.status === "ENVIADA" ? "aguardando" : formatDate(s.updatedAt),
                cor: s.status === "ANALISE" ? "#B4711A" : s.status === "ENVIADA" ? "#8FB0BF" : "#24603A",
              },
              {
                titulo: info.label,
                data: s.status === "COMPLEMENTO" ? "aguardando você" : "concluído",
                cor: s.status === "COMPLEMENTO" ? "#B4711A" : "#24603A",
              },
            ];

            return (
              <section
                key={s.id}
                style={{
                  background: "#fff",
                  border: "1px solid #DDD8CE",
                  borderLeft: `4px solid ${info.bg}`,
                  borderRadius: 4,
                  padding: "18px 20px",
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) 320px",
                  gap: 24,
                  alignItems: "start",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600 }}>{s.protocolo}</span>
                    <span style={{ display: "inline-block", padding: "4px 9px", borderRadius: 3, fontSize: 11.5, fontWeight: 600, background: info.bg, color: info.fg }}>
                      {info.label}
                    </span>
                    <span style={{ fontSize: 11.5, color: "#6B7480" }}>reenvios {s.reenvios} / 3</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, lineHeight: 1.1 }}>
                    {s.lote.quadra.nome} L{s.lote.numero} — {s.descricao.length > 60 ? s.descricao.slice(0, 60) + "…" : s.descricao}
                  </div>
                  <div style={{ fontSize: 13, color: "#4A5563", lineHeight: 1.5, maxWidth: "66ch" }}>{mensagem}</div>
                  {/* Só enquanto a bola está com o proprietário: depois do reenvio a
                      solicitação volta à CAPE, e as notas do ciclo anterior deixariam
                      a impressão de que ainda há algo a corrigir. */}
                  {pendencias.length > 0 && (s.status === "COMPLEMENTO" || s.status === "REPROVADA") && (
                    <div style={{ background: "#FDF8EE", border: "1px solid #E8D7B4", borderRadius: 4, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11 }}>
                      <div style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#8A5210" }}>
                        O que a CAPE apontou
                      </div>
                      {pendencias.map((p, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#6B4A11" }}>
                            {p.titulo}
                            {p.referencia && (
                              <span style={{ fontWeight: 400, color: "#8A5210" }}> · {p.referencia}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12.5, color: "#3B4653", lineHeight: 1.5, whiteSpace: "pre-line" }}>{p.texto}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {s.status === "COMPLEMENTO" && (
                    <SubstituirDocumentos
                      solicitacaoId={s.id}
                      documentos={s.documentos}
                      devolvidaNoChecklist={s.devolvidaNoChecklist}
                    />
                  )}
                  <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                    {s.status === "COMPLEMENTO" && (
                      <form action={reenviarComplementacaoAction.bind(null, s.id)}>
                        <button
                          type="submit"
                          style={{ border: "1px solid #B4711A", background: "#B4711A", color: "#fff", borderRadius: 4, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                        >
                          Enviar complementação
                        </button>
                      </form>
                    )}
                    {(s.status === "APROVADA" || s.status === "RESSALVAS") && (
                      <form action={enviarAlvaraAction.bind(null, s.id)}>
                        <button
                          type="submit"
                          style={{ border: "1px solid #12455E", background: "#12455E", color: "#fff", borderRadius: 4, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                        >
                          Enviar alvará de execução
                        </button>
                      </form>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0, borderLeft: "1px solid #EDE9E1", paddingLeft: 20 }}>
                  {etapas.map((e, i) => (
                    <div key={e.titulo} style={{ display: "grid", gridTemplateColumns: "14px 1fr", gap: 10, paddingBottom: 12 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: e.cor, marginTop: 4 }} />
                        {i < etapas.length - 1 && <span style={{ flex: 1, width: 1, background: "#E4DFD5" }} />}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0E1B24" }}>{e.titulo}</div>
                        <div style={{ fontSize: 11, color: "#6B7480", fontFamily: "var(--font-mono)" }}>{e.data}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
          <div style={{ background: "#FDF8EE", border: "1px solid #E8D7B4", borderRadius: 4, padding: "15px 18px", fontSize: 12.5, color: "#6B4A11", lineHeight: 1.5, maxWidth: "92ch" }}>
            Cada reenvio de documentação é reanalisado em até 10 dias corridos. São permitidos 3 reenvios por solicitação; a partir do 4º é necessária nova taxa de análise. O prazo para envio da documentação corrigida é de 6 meses, após o qual a solicitação é encerrada.
          </div>
        </div>
      </ScreenBody>
    </>
  );
}

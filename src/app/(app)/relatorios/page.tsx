import { requireRole } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { resolveEmpreendimentoAtual } from "@/lib/queries/empreendimentos-acesso";
import { getRelatorio, periodoPadrao } from "@/lib/queries/relatorio";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { EmpreendimentoSwitcher } from "@/components/EmpreendimentoSwitcher";
import { IRREGULARIDADE_LABEL, formatDate, formatDateTime } from "@/lib/status";

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

function Placar({ itens }: { itens: { rotulo: string; valor: number; cor: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
      {itens.map((i) => (
        <div
          key={i.rotulo}
          style={{ background: "#fff", border: "1px solid #DDD8CE", borderTop: `3px solid ${i.cor}`, borderRadius: 4, padding: "14px 15px", display: "flex", flexDirection: "column", gap: 5 }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 25, fontWeight: 600, lineHeight: 1 }}>{i.valor}</div>
          <div style={{ fontSize: 11.5, color: "#4A5563", lineHeight: 1.35 }}>{i.rotulo}</div>
        </div>
      ))}
    </div>
  );
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ emp?: string; de?: string; ate?: string }>;
}) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA", "SINDICO");
  const { emp: empParam, de: deParam, ate: ateParam } = await searchParams;
  const [user, { atual, opcoes }] = await Promise.all([
    getUserDisplay(session.user.id, session.user.role),
    resolveEmpreendimentoAtual(session.user.id, session.user.role, empParam),
  ]);

  if (!atual) {
    return (
      <>
        <ScreenHeader crumb="Gestão" title="Relatórios" {...user} />
        <ScreenBody>
          <div style={{ fontSize: 13.5, color: "#7A7472" }}>Nenhum empreendimento acessível à sua conta.</div>
        </ScreenBody>
      </>
    );
  }

  // Datas vêm da query string: valida o formato antes de virar Date, senão um valor
  // inventado na URL produziria "Invalid Date" e uma consulta sem sentido.
  const padrao = periodoPadrao();
  const de = deParam && DATA_RE.test(deParam) ? deParam : padrao.de;
  const ate = ateParam && DATA_RE.test(ateParam) ? ateParam : padrao.ate;

  const rel = await getRelatorio(atual.id, de, ate);

  return (
    <>
      <ScreenHeader crumb="Gestão" title="Relatórios" {...user} />
      <ScreenBody>
        <EmpreendimentoSwitcher atualId={atual.id} opcoes={opcoes} />

        <form
          method="get"
          style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: "14px 16px" }}
        >
          <input type="hidden" name="emp" value={atual.id} />
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#7A7472" }}>De</span>
            <input type="date" name="de" defaultValue={de} style={{ border: "1px solid #DDD8CE", borderRadius: 4, padding: "8px 10px", fontSize: 12.5, fontFamily: "var(--font-mono)" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#7A7472" }}>Até</span>
            <input type="date" name="ate" defaultValue={ate} style={{ border: "1px solid #DDD8CE", borderRadius: 4, padding: "8px 10px", fontSize: 12.5, fontFamily: "var(--font-mono)" }} />
          </label>
          <button
            type="submit"
            style={{ border: "1px solid #E01B22", background: "#E01B22", color: "#fff", borderRadius: 4, padding: "9px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
          >
            Aplicar período
          </button>
          <span style={{ fontSize: 11.5, color: "#7A7472" }}>
            Sem período informado, os últimos 30 dias.
          </span>
        </form>

        <section style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#7A7472" }}>
              Atividade da CAPE no período
            </div>
            <div style={{ fontSize: 12, color: "#4A5563" }}>
              {formatDate(new Date(`${de}T12:00:00`))} a {formatDate(new Date(`${ate}T12:00:00`))} ·{" "}
              <strong>{rel.totalAtendimentos}</strong> análise(s) e reanálise(s)
            </div>
          </div>
          <Placar itens={rel.atividade} />
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#7A7472" }}>
            Panorama do empreendimento — situação de hoje
          </div>
          <Placar itens={rel.panorama} />
        </section>

        <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #EDE9E1", fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
            Irregularidades registradas no período
          </div>
          {rel.irregularidades.length === 0 && (
            <div style={{ padding: 22, fontSize: 13, color: "#7A7472" }}>
              Nenhuma irregularidade registrada entre as datas selecionadas.
            </div>
          )}
          {rel.irregularidades.map((irr) => (
            <div key={irr.id} style={{ padding: "13px 18px", borderBottom: "1px solid #F1EEE7", display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: irr.regularizadaEm ? "#4A5563" : "#8C2B22" }}>
                  {IRREGULARIDADE_LABEL[irr.tipo]}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#7A7472" }}>
                  {irr.solicitacao.protocolo} · {irr.solicitacao.lote.quadra.nome} L{irr.solicitacao.lote.numero}
                </span>
                <span
                  style={{ padding: "2px 8px", borderRadius: 3, fontSize: 10.5, fontWeight: 600, background: irr.regularizadaEm ? "#D8E9DA" : "#F3DAD6", color: irr.regularizadaEm ? "#24603A" : "#8C2B22" }}
                >
                  {irr.regularizadaEm ? "regularizada" : "em aberto"}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "#3B4653", lineHeight: 1.5, whiteSpace: "pre-line" }}>{irr.descricao}</div>
              <div style={{ fontSize: 11, color: "#7A7472", fontFamily: "var(--font-mono)" }}>
                {formatDateTime(irr.createdAt)} · {irr.registradaPor.name}
              </div>
            </div>
          ))}
        </section>
      </ScreenBody>
    </>
  );
}

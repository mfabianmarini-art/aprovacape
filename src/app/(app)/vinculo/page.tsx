import { requireRole } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { getEmpreendimentosParaVinculo, getMeuVinculo } from "@/lib/queries/vinculo";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { formatDate } from "@/lib/status";
import { SolicitarVinculoForm } from "./SolicitarVinculoForm";

const VINCULO_STATUS = {
  PENDENTE: { label: "em análise pela CAPE", cor: "#8A5210" },
  APROVADO: { label: "aprovado", cor: "#24603A" },
  RECUSADO: { label: "recusado", cor: "#8C2B22" },
} as const;

type LoteResumo = { id: string; numero: string; quadra: { nome: string }; empreendimento: { nome: string } };
const nomeLote = (l: LoteResumo) => `${l.empreendimento.nome} · ${l.quadra.nome} L${l.numero}`;

// Fora do menu de propósito: chega-se aqui por Meus requerimentos e por Nova solicitação,
// como os check-lists a partir do empreendimento.
export default async function VinculoPage() {
  const session = await requireRole("PROPRIETARIO", "RESPONSAVEL_TECNICO");
  const [user, empreendimentos, meu] = await Promise.all([
    getUserDisplay(session.user.id, session.user.role),
    getEmpreendimentosParaVinculo(),
    getMeuVinculo(session.user.id),
  ]);
  const ehRT = session.user.role === "RESPONSAVEL_TECNICO";
  const lotes = ehRT ? meu.lotesComoRT : meu.lotesComoProprietario;
  const pendente = meu.vinculoStatus === "PENDENTE" ? meu.vinculoLote : null;
  const ultimo = meu.vinculoStatus ? VINCULO_STATUS[meu.vinculoStatus] : null;

  return (
    <>
      <ScreenHeader crumb="Meus lotes" title="Vínculo com lote" {...user} />
      <ScreenBody>
        <div className="layout-with-aside" style={{ "--aside-w": "300px" } as React.CSSProperties}>
          <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #EDE9E1" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
                Solicitar vínculo com outro lote
              </div>
              <div style={{ fontSize: 12, color: "#7A7472", marginTop: 4, lineHeight: 1.5 }}>
                {ehRT
                  ? "Anexe a autorização assinada pelo proprietário do lote e informe os dados dele."
                  : "Informe a matrícula do lote no cartório de registro de imóveis."}{" "}
                A CAPE confere e, aprovado, o lote passa a aparecer em Nova solicitação.
              </div>
            </div>
            {pendente ? (
              <div style={{ padding: 20, fontSize: 13, color: "#6B4A11", background: "#FDF8EE", lineHeight: 1.5 }}>
                Você já tem um pedido em análise para <strong>{nomeLote(pendente)}</strong>
                {meu.vinculoSolicitadoEm ? `, feito em ${formatDate(meu.vinculoSolicitadoEm)}` : ""}. Aguarde a resposta da
                CAPE para pedir outro vínculo.
              </div>
            ) : (
              <SolicitarVinculoForm empreendimentos={empreendimentos} ehRT={ehRT} />
            )}
          </section>

          <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: "16px 17px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#7A7472" }}>
                Lotes vinculados {ehRT ? "como RT" : "como proprietário"}
              </div>
              {lotes.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "#7A7472" }}>Nenhum lote vinculado ainda.</div>
              ) : (
                lotes.map((l) => (
                  <div key={l.id} style={{ fontSize: 13, fontWeight: 600 }}>
                    {nomeLote(l)}
                  </div>
                ))
              )}
            </section>
            {ultimo && meu.vinculoLote && (
              <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: "16px 17px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#7A7472" }}>Último pedido</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{nomeLote(meu.vinculoLote)}</div>
                <div style={{ fontSize: 12.5, color: ultimo.cor, fontWeight: 600 }}>{ultimo.label}</div>
                <div style={{ fontSize: 11, color: "#7A7472", fontFamily: "var(--font-mono)" }}>
                  {meu.vinculoSolicitadoEm ? `pedido em ${formatDate(meu.vinculoSolicitadoEm)}` : ""}
                  {meu.vinculoRevisadoEm ? ` · respondido em ${formatDate(meu.vinculoRevisadoEm)}` : ""}
                </div>
              </section>
            )}
          </aside>
        </div>
      </ScreenBody>
    </>
  );
}

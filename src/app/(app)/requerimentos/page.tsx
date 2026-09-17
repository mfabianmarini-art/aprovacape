import { requireRole } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { getMeusRequerimentos } from "@/lib/queries/requerimentos";
import { getMeuVinculo } from "@/lib/queries/vinculo";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { RequerimentoCard } from "./RequerimentoCard";

export default async function RequerimentosPage() {
  const session = await requireRole("PROPRIETARIO", "RESPONSAVEL_TECNICO");
  const [user, pedidos, meu] = await Promise.all([
    getUserDisplay(session.user.id, session.user.role),
    getMeusRequerimentos(session.user.id),
    getMeuVinculo(session.user.id),
  ]);
  const lotes = session.user.role === "RESPONSAVEL_TECNICO" ? meu.lotesComoRT : meu.lotesComoProprietario;
  const pendente = meu.vinculoStatus === "PENDENTE" ? meu.vinculoLote : null;

  // Prazos e limite são por empreendimento: só dá para citar números nesta nota geral
  // quando todos os requerimentos da pessoa são do mesmo.
  const empreendimentos = new Set(pedidos.map((s) => s.lote.empreendimentoId));
  const regras = empreendimentos.size === 1 ? pedidos[0].lote.empreendimento : null;

  return (
    <>
      <ScreenHeader crumb="Meus lotes" title="Requerimentos" {...user} />
      <ScreenBody>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Conta nova: o cadastro cria só o acesso, o vínculo com o lote é pedido
              aqui. Sem este aviso a tela abriria vazia, sem dizer o que fazer. */}
          {lotes.length === 0 && !pendente && (
            <div
              style={{
                background: "#fff",
                border: "1px solid #DDD8CE",
                borderTop: "3px solid #E01B22",
                borderRadius: 4,
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
                Nenhum lote vinculado ainda
              </div>
              <div style={{ fontSize: 12.5, color: "#4A5563", lineHeight: 1.5, maxWidth: "70ch" }}>
                Peça o vínculo com o seu lote para consultar as normas do empreendimento e abrir solicitações
                de obra. A CAPE analisa o pedido e, aprovado, o lote passa a aparecer aqui.
              </div>
              <a
                href="/vinculo"
                style={{ border: "1px solid #E01B22", background: "#E01B22", color: "#fff", borderRadius: 4, padding: "10px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
              >
                Solicitar vínculo com um lote
              </a>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 12.5 }}>
            <span style={{ color: pendente ? "#8A5210" : "#4A5563" }}>
              {pendente ? (
                <>
                  Pedido de vínculo com{" "}
                  <strong>
                    {pendente.empreendimento.nome} · {pendente.quadra.nome} L{pendente.numero}
                  </strong>{" "}
                  em análise pela CAPE.
                </>
              ) : (
                `${lotes.length} lote(s) vinculado(s) à sua conta.`
              )}
            </span>
            <a href="/vinculo" style={{ fontWeight: 600 }}>
              Solicitar vínculo com outro lote →
            </a>
          </div>
          {pedidos.length === 0 && (
            <div style={{ fontSize: 13.5, color: "#7A7472" }}>Nenhuma solicitação enviada ainda.</div>
          )}
          {pedidos.map((s) => (
            <RequerimentoCard
              key={s.id}
              s={s}
              // Aparece na lista por ter protocolado, mas o lote hoje é de outro
              // responsável: pode acompanhar, não agir.
              somenteLeitura={s.lote.proprietarioId !== session.user.id && s.lote.rtId !== session.user.id}
            />
          ))}
          <div style={{ background: "#FDF8EE", border: "1px solid #E8D7B4", borderRadius: 4, padding: "15px 18px", fontSize: 12.5, color: "#6B4A11", lineHeight: 1.5, maxWidth: "92ch" }}>
            <strong>Só contam como reenvio as devoluções da etapa de análise técnica (check-list).</strong> Quando a
            devolução é da validação documental — arquivo ilegível, faltando ou trocado —, corrigir e reenviar não
            consome nenhuma das suas reanálises.
            {regras && (
              <>
                {" "}
                Cada reenvio é reanalisado em até {regras.prazoDias} dias corridos. São permitidos {regras.reenviosSemTaxa}{" "}
                reenvios por solicitação; a partir daí é necessária nova taxa de análise. O prazo para enviar a
                documentação corrigida é de {regras.prazoComplementoDias} dias, após o qual a solicitação é encerrada.
              </>
            )}
          </div>
        </div>
      </ScreenBody>
    </>
  );
}

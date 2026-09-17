import { requireRole } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { getMeusRequerimentos } from "@/lib/queries/requerimentos";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { RequerimentoCard } from "./RequerimentoCard";

export default async function RequerimentosPage() {
  const session = await requireRole("PROPRIETARIO", "RESPONSAVEL_TECNICO");
  const [user, pedidos] = await Promise.all([
    getUserDisplay(session.user.id, session.user.role),
    getMeusRequerimentos(session.user.id),
  ]);

  // Prazos e limite são por empreendimento: só dá para citar números nesta nota geral
  // quando todos os requerimentos da pessoa são do mesmo.
  const empreendimentos = new Set(pedidos.map((s) => s.lote.empreendimentoId));
  const regras = empreendimentos.size === 1 ? pedidos[0].lote.empreendimento : null;

  return (
    <>
      <ScreenHeader crumb="Meus lotes" title="Requerimentos" {...user} />
      <ScreenBody>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pedidos.length === 0 && (
            <div style={{ fontSize: 13.5, color: "#7A7472" }}>Nenhuma solicitação enviada ainda.</div>
          )}
          {pedidos.map((s) => (
            <RequerimentoCard key={s.id} s={s} />
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

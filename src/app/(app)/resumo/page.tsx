import { requireRole } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { getResumoData } from "@/lib/queries/resumo";
import { resolveEmpreendimentoAtual } from "@/lib/queries/empreendimentos-acesso";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { EmpreendimentoSwitcher } from "@/components/EmpreendimentoSwitcher";
import { ResumoMapa } from "./ResumoMapa";

export default async function ResumoPage({ searchParams }: { searchParams: Promise<{ emp?: string }> }) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA", "SINDICO");
  const { emp: empParam } = await searchParams;
  const [user, { atual, opcoes }] = await Promise.all([
    getUserDisplay(session.user.id, session.user.role),
    resolveEmpreendimentoAtual(session.user.id, session.user.role, empParam),
  ]);

  if (!atual) {
    return (
      <>
        <ScreenHeader crumb="CAPE Aprova" title="Resumo dos Loteamentos" {...user} />
        <ScreenBody>
          <div style={{ fontSize: 13.5, color: "#7A7472" }}>
            Nenhum empreendimento cadastrado ainda.
          </div>
        </ScreenBody>
      </>
    );
  }

  const data = await getResumoData(atual.id);
  if (!data) {
    return (
      <>
        <ScreenHeader crumb="CAPE Aprova" title="Resumo dos Loteamentos" {...user} />
        <ScreenBody>
          <div style={{ fontSize: 13.5, color: "#7A7472" }}>
            Nenhum empreendimento cadastrado ainda.
          </div>
        </ScreenBody>
      </>
    );
  }

  return (
    <>
      <ScreenHeader
        crumb={`${data.empreendimento.nome} · ${data.empreendimento.cidade}/${data.empreendimento.uf}`}
        title="Situação geral do loteamento"
        {...user}
      />
      <ScreenBody>
        <EmpreendimentoSwitcher atualId={atual.id} opcoes={opcoes} />
        <ResumoMapa data={data} podeAnalisar={session.user.role === "ADMIN_CAPE" || session.user.role === "CAPE_ANALISTA"} />
      </ScreenBody>
    </>
  );
}

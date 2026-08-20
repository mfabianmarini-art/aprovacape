import { requireRole } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { getResumoData } from "@/lib/queries/resumo";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { ResumoMapa } from "./ResumoMapa";

export default async function ResumoPage() {
  const session = await requireRole("CAPE_ANALISTA", "SINDICO");
  const [user, data] = await Promise.all([
    getUserDisplay(session.user.id, session.user.role),
    getResumoData(),
  ]);

  if (!data) {
    return (
      <>
        <ScreenHeader crumb="CAPE Aprova" title="Resumo do loteamento" {...user} />
        <ScreenBody>
          <div style={{ fontSize: 13.5, color: "#6B7480" }}>
            Nenhum empreendimento cadastrado ainda.
          </div>
        </ScreenBody>
      </>
    );
  }

  return (
    <>
      <ScreenHeader
        crumb={`${data.empreendimento.nome} · Jarinu/SP`}
        title="Situação geral do loteamento"
        {...user}
      />
      <ScreenBody>
        <ResumoMapa data={data} podeAnalisar={session.user.role === "CAPE_ANALISTA"} />
      </ScreenBody>
    </>
  );
}

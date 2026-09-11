import { requireRole } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { getObrasEmAndamento } from "@/lib/queries/obras";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { ObrasTable } from "./ObrasTable";

export default async function ObrasPage() {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const [user, obras] = await Promise.all([
    getUserDisplay(session.user.id, session.user.role),
    getObrasEmAndamento(),
  ]);

  return (
    <>
      <ScreenHeader crumb="CAPE · Acompanhamento" title="Obras em andamento" {...user} />
      <ScreenBody>
        <ObrasTable obras={obras} />
      </ScreenBody>
    </>
  );
}

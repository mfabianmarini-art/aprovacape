import { requireRole } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { getFila } from "@/lib/queries/fila";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { FilaTable } from "./FilaTable";

export default async function FilaPage() {
  const session = await requireRole("CAPE_ANALISTA");
  const [user, fila] = await Promise.all([getUserDisplay(session.user.id, session.user.role), getFila()]);

  return (
    <>
      <ScreenHeader crumb="CAPE · Análise técnica" title="Fila de solicitações" {...user} />
      <ScreenBody>
        <FilaTable fila={fila} />
      </ScreenBody>
    </>
  );
}

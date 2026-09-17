import { requireRole } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { getVinculosPendentes } from "@/lib/queries/usuarios";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { VinculosTable } from "./VinculosTable";

export default async function VinculosPage() {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const [user, pendentes] = await Promise.all([
    getUserDisplay(session.user.id, session.user.role),
    getVinculosPendentes(),
  ]);

  return (
    <>
      <ScreenHeader crumb="Análise" title="Aprovação de Vínculo" {...user} />
      <ScreenBody>
        <div style={{ fontSize: 13, color: "#4A5563", lineHeight: 1.5 }}>
          Proprietários e responsáveis técnicos se cadastram sozinhos e já acessam a plataforma; quem já tem conta
          também pode pedir vínculo com outro lote. A CAPE confere cada pedido aqui — clique em uma linha para ver os
          dados informados, os lotes que a pessoa já tem e a comprovação.
        </div>
        <VinculosTable pendentes={pendentes} />
      </ScreenBody>
    </>
  );
}

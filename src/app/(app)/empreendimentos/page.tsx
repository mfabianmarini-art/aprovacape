import { requireRole } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { getEmpreendimentoConfig } from "@/lib/queries/empreendimento";
import { resolveEmpreendimentoAtual } from "@/lib/queries/empreendimentos-acesso";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { EmpreendimentoSwitcher } from "@/components/EmpreendimentoSwitcher";
import { EmpreendimentoForm } from "./EmpreendimentoForm";
import { PlantaUpload } from "./PlantaUpload";
import { NovoEmpreendimentoForm } from "./NovoEmpreendimentoForm";
import { QuadrasManager } from "./QuadrasManager";

export default async function EmpreendimentosPage({ searchParams }: { searchParams: Promise<{ emp?: string }> }) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const { emp: empParam } = await searchParams;
  const [user, { atual, opcoes }] = await Promise.all([
    getUserDisplay(session.user.id, session.user.role),
    resolveEmpreendimentoAtual(session.user.id, session.user.role, empParam),
  ]);
  const isAdmin = session.user.role === "ADMIN_CAPE";

  const data = atual ? await getEmpreendimentoConfig(atual.id) : null;

  if (!data) {
    return (
      <>
        <ScreenHeader crumb="Configuração" title="Empreendimentos" {...user} />
        <ScreenBody>
          <div style={{ fontSize: 13.5, color: "#6B7480" }}>Nenhum empreendimento cadastrado ainda.</div>
          {isAdmin && <NovoEmpreendimentoForm />}
        </ScreenBody>
      </>
    );
  }

  const { empreendimento: emp, quadrasCfg } = data;
  const totalLotes = emp.quadras.reduce((a, q) => a + q.totalLotes, 0);

  return (
    <>
      <ScreenHeader crumb="Configuração" title="Empreendimentos" {...user} />
      <ScreenBody>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <EmpreendimentoSwitcher atualId={emp.id} opcoes={opcoes} />
          {isAdmin && <NovoEmpreendimentoForm />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 20, alignItems: "start" }}>
          <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4 }}>
            <div style={{ padding: "15px 18px", borderBottom: "1px solid #EDE9E1", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>{emp.nome}</div>
              <div style={{ fontSize: 11.5, color: "#6B7480", fontFamily: "var(--font-mono)" }}>
                {emp.cidade}/{emp.uf} · {totalLotes} lotes
              </div>
            </div>
            <EmpreendimentoForm
              id={emp.id}
              taxaAnaliseCent={emp.taxaAnaliseCent}
              prazoDias={emp.prazoDias}
              reenviosSemTaxa={emp.reenviosSemTaxa}
              taxaVisitaCent={emp.taxaVisitaCent}
            />
            <div style={{ padding: "0 20px 20px" }}>
              <QuadrasManager empreendimentoId={emp.id} quadras={quadrasCfg} />
            </div>
          </section>
          <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <PlantaUpload empreendimentoId={emp.id} plantaImageUrl={emp.plantaImageUrl} />
            <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: "16px 17px", display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#6B7480" }}>Síndico vinculado</div>
              {emp.sindico ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{emp.sindico.name}</div>
                  <div style={{ fontSize: 11.5, color: "#6B7480" }}>{emp.sindico.email} · acesso somente leitura</div>
                </>
              ) : (
                <div style={{ fontSize: 12.5, color: "#6B7480" }}>Nenhum síndico vinculado.</div>
              )}
            </section>
          </aside>
        </div>
      </ScreenBody>
    </>
  );
}

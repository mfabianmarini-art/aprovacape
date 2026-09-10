import { requireRole } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { prisma } from "@/lib/prisma";
import { resolveEmpreendimentoAtual } from "@/lib/queries/empreendimentos-acesso";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { EmpreendimentoSwitcher } from "@/components/EmpreendimentoSwitcher";
import { EditableField } from "@/components/EditableField";
import {
  renameCategoriaAction,
  updateItemAction,
  deleteItemAction,
  addItemAction,
  addCategoriaAction,
  deleteCategoriaAction,
} from "@/lib/actions/checklist-actions";

export default async function ChecklistsPage({ searchParams }: { searchParams: Promise<{ emp?: string }> }) {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const { emp: empParam } = await searchParams;
  const [user, { atual, opcoes }] = await Promise.all([
    getUserDisplay(session.user.id, session.user.role),
    resolveEmpreendimentoAtual(session.user.id, session.user.role, empParam),
  ]);

  const emp = atual
    ? await prisma.empreendimento.findUnique({
        where: { id: atual.id },
        include: { categorias: { orderBy: { ordem: "asc" }, include: { itens: { orderBy: { ordem: "asc" } } } } },
      })
    : null;

  if (!emp) {
    return (
      <>
        <ScreenHeader crumb="Configuração" title="Check-lists por empreendimento" {...user} />
        <ScreenBody>
          <div style={{ fontSize: 13.5, color: "#6B7480" }}>Nenhum empreendimento cadastrado ainda.</div>
        </ScreenBody>
      </>
    );
  }

  const totalItens = emp.categorias.reduce((a, c) => a + c.itens.length, 0);

  return (
    <>
      <ScreenHeader crumb="Configuração" title="Check-lists por empreendimento" {...user} />
      <ScreenBody>
        <EmpreendimentoSwitcher atualId={emp.id} opcoes={opcoes} />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 20, alignItems: "start" }}>
          <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4 }}>
            <div style={{ padding: "15px 18px", borderBottom: "1px solid #EDE9E1", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>{emp.nome}</div>
                <div style={{ fontSize: 11.5, color: "#6B7480" }}>
                  {emp.categorias.length} categorias · {totalItens} itens
                </div>
              </div>
              <form action={addCategoriaAction.bind(null, emp.id)}>
                <button type="submit" style={{ border: "1px solid #12455E", background: "#12455E", color: "#fff", borderRadius: 4, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                  Nova categoria
                </button>
              </form>
            </div>

            {emp.categorias.map((c) => (
              <div key={c.id} style={{ borderBottom: "1px solid #EDE9E1" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 18px", background: "#FAF9F6", gap: 12 }}>
                  <EditableField
                    defaultValue={c.nome}
                    onSave={renameCategoriaAction.bind(null, c.id)}
                    style={{
                      border: "1px solid transparent",
                      background: "transparent",
                      fontSize: 11,
                      letterSpacing: ".14em",
                      textTransform: "uppercase",
                      color: "#12455E",
                      fontWeight: 600,
                      padding: "4px 6px",
                      borderRadius: 3,
                      flex: 1,
                    }}
                  />
                  <div style={{ fontSize: 11, color: "#6B7480", fontFamily: "var(--font-mono)" }}>{c.itens.length} itens</div>
                  <form action={deleteCategoriaAction.bind(null, c.id)}>
                    <button type="submit" style={{ border: "1px solid #EDE9E1", background: "#fff", color: "#8C2B22", borderRadius: 4, padding: "5px 9px", fontSize: 12, cursor: "pointer" }}>
                      remover categoria
                    </button>
                  </form>
                </div>
                {c.itens.map((i) => (
                  <div key={i.id} style={{ display: "grid", gridTemplateColumns: "1fr 220px 34px", alignItems: "center", gap: 12, padding: "11px 18px", borderTop: "1px solid #F5F2EC" }}>
                    <EditableField
                      defaultValue={i.texto}
                      onSave={updateItemAction.bind(null, i.id, "texto")}
                      style={{ border: "1px solid #EDE9E1", borderRadius: 4, padding: "8px 10px", fontSize: 13, background: "#fff" }}
                    />
                    <EditableField
                      defaultValue={i.referencia}
                      onSave={updateItemAction.bind(null, i.id, "referencia")}
                      style={{ border: "1px solid #EDE9E1", borderRadius: 4, padding: "8px 10px", fontSize: 12, color: "#6B7480", background: "#fff" }}
                    />
                    <form action={deleteItemAction.bind(null, i.id)}>
                      <button type="submit" style={{ border: "1px solid #EDE9E1", background: "#fff", color: "#8C2B22", borderRadius: 4, padding: "7px 0", fontSize: 13, cursor: "pointer", width: "100%" }}>
                        ×
                      </button>
                    </form>
                  </div>
                ))}
                <div style={{ padding: "10px 18px 14px" }}>
                  <form key={c.itens.length} action={addItemAction.bind(null, c.id)} style={{ display: "grid", gridTemplateColumns: "1fr 220px auto", gap: 8 }}>
                    <input name="texto" placeholder="Novo item…" required style={{ border: "1px dashed #C9C2B4", borderRadius: 4, padding: "8px 10px", fontSize: 13 }} />
                    <input name="referencia" placeholder="Referência (art.)" style={{ border: "1px dashed #C9C2B4", borderRadius: 4, padding: "8px 10px", fontSize: 12 }} />
                    <button type="submit" style={{ border: "1px dashed #C9C2B4", background: "#fff", color: "#12455E", borderRadius: 4, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      + item
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </section>
          <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: "16px 17px", display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#6B7480" }}>Aplicado a</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{emp.nome}</div>
              <div style={{ fontSize: 11.5, color: "#6B7480", lineHeight: 1.45 }}>
                Cada empreendimento tem seu próprio check-list. Alterações valem para solicitações novas; as em andamento seguem os itens já vinculados.
              </div>
            </section>
            <section style={{ background: "#FDF8EE", border: "1px solid #E8D7B4", borderRadius: 4, padding: "16px 17px", fontSize: 12.5, color: "#6B4A11", lineHeight: 1.5 }}>
              Na reanálise, apenas os itens reprovados anteriormente são reabertos. Itens já aprovados permanecem travados.
            </section>
          </aside>
        </div>
      </ScreenBody>
    </>
  );
}

import { requireRole } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { getEquipeCape } from "@/lib/queries/usuarios";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { ROLE_LABEL, ROLE_COLOR } from "@/lib/nav";
import { formatRegistro } from "@/lib/registro-profissional";
import { NovoInternoForm } from "./NovoInternoForm";

export default async function UsuariosPage() {
  const session = await requireRole("ADMIN_CAPE", "CAPE_ANALISTA");
  const [user, equipe] = await Promise.all([getUserDisplay(session.user.id, session.user.role), getEquipeCape()]);

  return (
    <>
      <ScreenHeader crumb="Configuração" title="Cadastrar Usuário" {...user} />
      <ScreenBody>
        <div className="layout-with-aside" style={{ "--aside-w": "330px" } as React.CSSProperties}>
          <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, overflow: "hidden" }}>
            <div className="table-scroll">
              <div style={{ minWidth: 560 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 165px 190px", padding: "11px 18px", background: "#FAF9F6", borderBottom: "1px solid #EDE9E1", fontSize: 10.5, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" }}>
                  <div>Usuário</div>
                  <div>Perfil</div>
                  <div>Registro</div>
                </div>
                {equipe.map((u) => {
                  const cor = ROLE_COLOR[u.role];
                  return (
                    <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 165px 190px", alignItems: "center", padding: "13px 18px", borderBottom: "1px solid #F1EEE7" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingRight: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: 11.5, color: "#7A7472" }}>{u.email}</div>
                      </div>
                      <div>
                        <span style={{ display: "inline-block", padding: "4px 9px", borderRadius: 3, fontSize: 11.5, fontWeight: 600, background: cor.bg, color: cor.fg }}>{ROLE_LABEL[u.role]}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#4A5563", fontFamily: "var(--font-mono)" }}>{formatRegistro(u) ?? "—"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
          <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <NovoInternoForm podeAtribuirAdmin={session.user.role === "ADMIN_CAPE"} />
            <section style={{ background: "#FDF8EE", border: "1px solid #E8D7B4", borderRadius: 4, padding: "16px 17px", fontSize: 12.5, color: "#6B4A11", lineHeight: 1.5 }}>
              Síndicos, proprietários e responsáveis técnicos pertencem a um empreendimento específico — são cadastrados
              e validados dentro de cada empreendimento, na tela Empreendimentos.
            </section>
          </aside>
        </div>
      </ScreenBody>
    </>
  );
}

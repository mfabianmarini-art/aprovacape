import Link from "next/link";
import { ROLE_LABEL, ROLE_COLOR } from "@/lib/nav";
import type { getUsuariosDoEmpreendimento, getSindicos } from "@/lib/queries/usuarios";
import { SindicoManager } from "./SindicoManager";

type Usuarios = Awaited<ReturnType<typeof getUsuariosDoEmpreendimento>>;
type Sindicos = Awaited<ReturnType<typeof getSindicos>>;

export function UsuariosSection({
  empreendimentoId,
  usuarios,
  pendentes,
  sindicos,
  sindicoAtual,
}: {
  empreendimentoId: string;
  usuarios: Usuarios;
  pendentes: number;
  sindicos: Sindicos;
  sindicoAtual: { id: string; name: string; email: string } | null;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#6B7480" }}>Usuários deste empreendimento</div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 20, alignItems: "start" }}>
        <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, overflow: "hidden" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 165px 190px", padding: "11px 18px", background: "#FAF9F6", borderBottom: "1px solid #EDE9E1", fontSize: 10.5, letterSpacing: ".13em", textTransform: "uppercase", color: "#6B7480" }}
          >
            <div>Usuário</div>
            <div>Perfil</div>
            <div>Vínculo</div>
          </div>
          {usuarios.length === 0 && (
            <div style={{ padding: 24, fontSize: 13, color: "#6B7480" }}>
              Nenhum usuário vinculado a este empreendimento ainda.
            </div>
          )}
          {usuarios.map((u) => {
            const cor = ROLE_COLOR[u.role];
            const lotes = [...u.lotesComoProprietario, ...u.lotesComoRT];
            const vinculo = lotes.length
              ? lotes.map((l) => `${l.quadra.nome} L${l.numero}`).join(", ")
              : u.role === "SINDICO"
                ? "Síndico do empreendimento"
                : "—";
            return (
              <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 165px 190px", alignItems: "center", padding: "13px 18px", borderBottom: "1px solid #F1EEE7" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingRight: 14 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: 11.5, color: "#6B7480" }}>{u.email}</div>
                </div>
                <div>
                  <span style={{ display: "inline-block", padding: "4px 9px", borderRadius: 3, fontSize: 11.5, fontWeight: 600, background: cor.bg, color: cor.fg }}>
                    {ROLE_LABEL[u.role]}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#4A5563" }}>{vinculo}</div>
              </div>
            );
          })}
        </section>

        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SindicoManager empreendimentoId={empreendimentoId} atual={sindicoAtual} disponiveis={sindicos} />

          {pendentes > 0 && (
            <section style={{ background: "#FDF8EE", border: "1px solid #E8D7B4", borderRadius: 4, padding: "16px 17px", fontSize: 12.5, color: "#6B4A11", lineHeight: 1.5 }}>
              {pendentes} vínculo(s) deste empreendimento aguardando validação. A análise é feita em{" "}
              <Link href="/vinculos" style={{ color: "#6B4A11", fontWeight: 600 }}>
                Vínculos a validar
              </Link>
              , que reúne os pedidos de todos os empreendimentos.
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

import { ROLE_LABEL, ROLE_COLOR } from "@/lib/nav";
import { formatDate } from "@/lib/status";
import { aprovarVinculoAction, recusarVinculoAction } from "@/lib/actions/usuarios-actions";
import type { getUsuariosDoEmpreendimento, getVinculosPendentesDoEmpreendimento, getSindicos } from "@/lib/queries/usuarios";
import { SindicoManager } from "./SindicoManager";

type Usuarios = Awaited<ReturnType<typeof getUsuariosDoEmpreendimento>>;
type Pendentes = Awaited<ReturnType<typeof getVinculosPendentesDoEmpreendimento>>;
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
  pendentes: Pendentes;
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

          <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderTop: "3px solid #B4711A", borderRadius: 4, padding: 18, display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>Vínculos a validar</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#6B7480" }}>{pendentes.length} pendente(s)</div>
            </div>
            <div style={{ fontSize: 12, color: "#4A5563", lineHeight: 1.5 }}>
              Proprietários e responsáveis técnicos se cadastram sozinhos e já acessam a plataforma. A CAPE confere o vínculo com o lote em paralelo e entra em contato se a comprovação não corresponder.
            </div>
            {pendentes.length === 0 && <div style={{ fontSize: 12.5, color: "#6B7480" }}>Nenhum vínculo pendente.</div>}
            {pendentes.map((p) => (
              <div key={p.id} style={{ border: "1px solid #EDE9E1", borderRadius: 4, padding: "13px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: "#6B7480" }}>
                    {ROLE_LABEL[p.role]} · {p.vinculoLote ? `${p.vinculoLote.quadra.nome} L${p.vinculoLote.numero}` : "—"}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    ["E-mail", p.email],
                    ["Telefone", p.phone],
                    ["CPF", p.cpf],
                    ["Nascimento", formatDate(p.birthDate)],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 8, fontSize: 11.5 }}>
                      <span style={{ color: "#6B7480", letterSpacing: ".06em", textTransform: "uppercase", fontSize: 10, paddingTop: 2 }}>{k}</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "#3B4653" }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 8, fontSize: 11.5 }}>
                    <span style={{ color: "#6B7480", letterSpacing: ".06em", textTransform: "uppercase", fontSize: 10, paddingTop: 2 }}>Comprovação</span>
                    {p.vinculoArquivoCaminho ? (
                      <a
                        href={`/api/vinculo-autorizacao/${p.id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 11.5, fontWeight: 600, color: "#12455E" }}
                      >
                        {p.vinculoArquivoNome ?? "Autorização do proprietário"}
                      </a>
                    ) : (
                      <span style={{ fontFamily: "var(--font-mono)", color: "#3B4653" }}>{p.vinculoComprovacao ?? "—"}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <form action={aprovarVinculoAction.bind(null, p.id)} style={{ flex: 1 }}>
                    <button type="submit" style={{ width: "100%", border: "1px solid #C6DAC9", background: "#FFFFFF", color: "#24603A", borderRadius: 4, padding: "8px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Aprovar vínculo
                    </button>
                  </form>
                  <form action={recusarVinculoAction.bind(null, p.id)}>
                    <button type="submit" style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#8C2B22", borderRadius: 4, padding: "8px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Recusar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}

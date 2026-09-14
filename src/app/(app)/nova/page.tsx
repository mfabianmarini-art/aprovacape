import { requireRole } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { getMeusLotes, getMeusRascunhos, getRascunho } from "@/lib/queries/nova";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { formatBRL } from "@/lib/status";
import { Step1Form } from "./Step1Form";
import { Step2Uploads } from "./Step2Uploads";
import { Step3Send } from "./Step3Send";
import { RascunhosEmAndamento } from "./RascunhosEmAndamento";

export default async function NovaPage({
  searchParams,
}: {
  searchParams: Promise<{ rascunho?: string; passo?: string }>;
}) {
  const session = await requireRole("PROPRIETARIO", "RESPONSAVEL_TECNICO");
  const { rascunho: rascunhoId, passo: passoParam } = await searchParams;

  const [user, lotes, rascunhos] = await Promise.all([
    getUserDisplay(session.user.id, session.user.role),
    getMeusLotes(session.user.id),
    getMeusRascunhos(session.user.id),
  ]);

  const rascunho = rascunhoId ? await getRascunho(rascunhoId) : null;
  const rascunhoValido =
    rascunho && rascunho.status === "RASCUNHO" && (rascunho.lote.proprietarioId === session.user.id || rascunho.lote.rtId === session.user.id)
      ? rascunho
      : null;

  const passo = rascunhoValido ? (passoParam === "3" ? 3 : 2) : 1;
  const emp = rascunhoValido?.lote.empreendimento ?? lotes[0]?.empreendimento;

  const passos = [
    { n: 1, label: "Lote e obra" },
    { n: 2, label: "Documentos" },
    { n: 3, label: "Responsável e declarações" },
  ];

  return (
    <>
      <ScreenHeader crumb={emp?.nome ?? "Nova solicitação"} title="Nova solicitação de obra" {...user} />
      <ScreenBody>
        {passo === 1 && <RascunhosEmAndamento rascunhos={rascunhos} />}
        <div className="layout-with-aside" style={{ "--aside-w": "300px" } as React.CSSProperties}>
          <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4 }}>
            <div style={{ display: "flex", borderBottom: "1px solid #EDE9E1" }}>
              {passos.map((p) => {
                const disponivel = p.n === 1 || !!rascunhoValido;
                const href = p.n === 1 ? "/nova" : `/nova?rascunho=${rascunhoValido?.id}&passo=${p.n}`;
                const ativo = passo === p.n;
                const content = (
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7A7472" }}>{String(p.n).padStart(2, "0")}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: ativo ? "#231F20" : "#7A7472" }}>{p.label}</span>
                  </div>
                );
                return disponivel ? (
                  <a
                    key={p.n}
                    href={href}
                    style={{
                      flex: 1,
                      borderBottom: `3px solid ${ativo ? "#E01B22" : "transparent"}`,
                      background: "#fff",
                      padding: "14px 10px",
                      textDecoration: "none",
                    }}
                  >
                    {content}
                  </a>
                ) : (
                  <div key={p.n} style={{ flex: 1, borderBottom: "3px solid transparent", padding: "14px 10px", opacity: 0.4 }}>
                    {content}
                  </div>
                );
              })}
            </div>

            {passo === 1 && <Step1Form lotes={lotes} />}
            {passo === 2 && rascunhoValido && <Step2Uploads rascunho={rascunhoValido} />}
            {passo === 3 && rascunhoValido && <Step3Send rascunho={rascunhoValido} sessionUser={{ name: session.user.name, role: session.user.role }} />}
          </section>

          <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {emp && (
              <>
                <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: "16px 17px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#7A7472" }}>Taxa de análise</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 600 }}>{formatBRL(emp.taxaAnaliseCent)}</div>
                  <div style={{ fontSize: 11.5, color: "#4A5563", lineHeight: 1.45 }}>
                    Valor configurado para este empreendimento. Reunião presencial, se solicitada, {formatBRL(emp.taxaVisitaCent)} por visita.
                  </div>
                </section>
                <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: "16px 17px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#7A7472" }}>Prazos</div>
                  <div style={{ fontSize: 12.5, color: "#3B4653", lineHeight: 1.5 }}>
                    Análise em até {emp.prazoDias} dias corridos após a entrega completa do check-list. Reanálise também em {emp.prazoDias} dias. Correções do proprietário: até {emp.prazoComplementoDias} dias.
                  </div>
                </section>
              </>
            )}
            <section style={{ background: "#231F20", color: "#fff", borderRadius: 4, padding: "16px 17px", fontSize: 12.5, lineHeight: 1.5 }}>
              A aprovação da CAPE não substitui a aprovação da Prefeitura. O início da obra depende do projeto aprovado e do alvará de execução.
            </section>
          </aside>
        </div>
      </ScreenBody>
    </>
  );
}

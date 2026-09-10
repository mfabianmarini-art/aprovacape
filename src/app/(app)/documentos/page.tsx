import { requireSession } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { getDocumentosTecnicos } from "@/lib/queries/documentos-tecnicos";
import { resolveEmpreendimentoAtual } from "@/lib/queries/empreendimentos-acesso";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { EmpreendimentoSwitcher } from "@/components/EmpreendimentoSwitcher";
import { DocumentoUploadForm } from "./DocumentoUploadForm";
import { DocumentosList } from "./DocumentosList";

const PODE_GERENCIAR = new Set(["ADMIN_CAPE", "CAPE_ANALISTA", "SINDICO"]);

export default async function DocumentosPage({ searchParams }: { searchParams: Promise<{ emp?: string }> }) {
  const session = await requireSession();
  const { emp: empParam } = await searchParams;
  const [user, { atual, opcoes }] = await Promise.all([
    getUserDisplay(session.user.id, session.user.role),
    resolveEmpreendimentoAtual(session.user.id, session.user.role, empParam),
  ]);
  const podeGerenciar = PODE_GERENCIAR.has(session.user.role);

  if (!atual) {
    return (
      <>
        <ScreenHeader crumb="Referência" title="Documentos técnicos" {...user} />
        <ScreenBody>
          <div style={{ fontSize: 13.5, color: "#6B7480" }}>
            {session.user.role === "PROPRIETARIO" || session.user.role === "RESPONSAVEL_TECNICO"
              ? "Nenhum lote vinculado à sua conta ainda — assim que a CAPE confirmar seu vínculo, os documentos do empreendimento aparecem aqui."
              : "Nenhum empreendimento cadastrado ainda."}
          </div>
        </ScreenBody>
      </>
    );
  }

  const documentos = await getDocumentosTecnicos(atual.id);

  return (
    <>
      <ScreenHeader crumb="Referência" title="Documentos técnicos" {...user} />
      <ScreenBody>
        <EmpreendimentoSwitcher atualId={atual.id} opcoes={opcoes} />
        <div style={{ display: "grid", gridTemplateColumns: podeGerenciar ? "minmax(0,1fr) 320px" : "1fr", gap: 20, alignItems: "start" }}>
          <DocumentosList documentos={documentos} podeGerenciar={podeGerenciar} />
          {podeGerenciar && (
            <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <DocumentoUploadForm empreendimentoId={atual.id} />
              <section
                style={{ background: "#FDF8EE", border: "1px solid #E8D7B4", borderRadius: 4, padding: "16px 17px", fontSize: 12.5, color: "#6B4A11", lineHeight: 1.5 }}
              >
                Manual do proprietário, convenção do condomínio e outras regras ficam disponíveis aqui para consulta de
                proprietários e responsáveis técnicos na hora de elaborar o projeto.
              </section>
            </aside>
          )}
        </div>
      </ScreenBody>
    </>
  );
}

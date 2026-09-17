import { requireSession } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { getDocumentosTecnicos } from "@/lib/queries/documentos-tecnicos";
import { resolveEmpreendimentoAtual } from "@/lib/queries/empreendimentos-acesso";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { EmpreendimentoSwitcher } from "@/components/EmpreendimentoSwitcher";
import { labelDaTela } from "@/lib/nav";
import { DocumentosList } from "./DocumentosList";
import { DocumentoUploadForm } from "./DocumentoUploadForm";

export default async function DocumentosPage({ searchParams }: { searchParams: Promise<{ emp?: string }> }) {
  const session = await requireSession();
  const { emp: empParam } = await searchParams;
  const [user, { atual, opcoes }] = await Promise.all([
    getUserDisplay(session.user.id, session.user.role),
    resolveEmpreendimentoAtual(session.user.id, session.user.role, empParam),
  ]);

  const titulo = labelDaTela("documentos", session.user.role);
  const ehConsulta =
    session.user.role === "PROPRIETARIO" || session.user.role === "RESPONSAVEL_TECNICO";

  if (!atual) {
    return (
      <>
        <ScreenHeader crumb="Referência" title={titulo} {...user} />
        <ScreenBody>
          <div style={{ fontSize: 13.5, color: "#7A7472" }}>
            {ehConsulta
              ? "Nenhum lote vinculado à sua conta ainda. Peça o vínculo com o seu lote em Meus requerimentos para consultar as normas do empreendimento."
              : "Nenhum empreendimento cadastrado ainda."}
          </div>
        </ScreenBody>
      </>
    );
  }

  const documentos = await getDocumentosTecnicos(atual.id);
  // A lista de empreendimentos acessíveis a um síndico já vem filtrada por sindicoId,
  // então estar aqui como síndico significa administrar este empreendimento.
  const podeGerenciar = session.user.role === "SINDICO";

  return (
    <>
      <ScreenHeader crumb="Referência" title={titulo} {...user} />
      <ScreenBody>
        <EmpreendimentoSwitcher atualId={atual.id} opcoes={opcoes} />
        {ehConsulta && (
          <div style={{ fontSize: 13.5, color: "#3B4653", lineHeight: 1.5 }}>
            Consulte aqui todas as regras e documentação técnica para elaborar o projeto.
          </div>
        )}
        <div className={podeGerenciar ? "layout-with-aside" : undefined} style={podeGerenciar ? undefined : { display: "grid", gridTemplateColumns: "1fr" }}>
          <DocumentosList documentos={documentos} podeGerenciar={podeGerenciar} />
          {podeGerenciar && <DocumentoUploadForm empreendimentoId={atual.id} />}
        </div>
        {podeGerenciar && (
          <div style={{ fontSize: 12.5, color: "#6B4A11", background: "#FDF8EE", border: "1px solid #E8D7B4", borderRadius: 4, padding: "14px 16px", lineHeight: 1.5 }}>
            Manual do proprietário, convenção do condomínio e outras regras ficam aqui para consulta de proprietários e
            responsáveis técnicos. A descrição de cada documento é o que explica a eles do que se trata.
          </div>
        )}
      </ScreenBody>
    </>
  );
}

import { requireSession } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { getDocumentosTecnicos } from "@/lib/queries/documentos-tecnicos";
import { resolveEmpreendimentoAtual } from "@/lib/queries/empreendimentos-acesso";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";
import { EmpreendimentoSwitcher } from "@/components/EmpreendimentoSwitcher";
import { DocumentosList } from "./DocumentosList";

export default async function DocumentosPage({ searchParams }: { searchParams: Promise<{ emp?: string }> }) {
  const session = await requireSession();
  const { emp: empParam } = await searchParams;
  const [user, { atual, opcoes }] = await Promise.all([
    getUserDisplay(session.user.id, session.user.role),
    resolveEmpreendimentoAtual(session.user.id, session.user.role, empParam),
  ]);

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
        <DocumentosList documentos={documentos} podeGerenciar={false} />
        <div style={{ fontSize: 12.5, color: "#6B4A11", background: "#FDF8EE", border: "1px solid #E8D7B4", borderRadius: 4, padding: "14px 16px", lineHeight: 1.5 }}>
          Manual do proprietário, convenção do condomínio e outras regras ficam disponíveis aqui para consulta na hora
          de elaborar o projeto. O cadastro de novos documentos é feito pela CAPE em Empreendimentos.
        </div>
      </ScreenBody>
    </>
  );
}

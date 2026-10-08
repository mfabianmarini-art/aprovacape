import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cookieAcompanhamento, tokenConfere } from "@/lib/acompanhamento";
import { etapasDaSolicitacao } from "@/lib/etapas";
import { STATUS_INFO, TIPO_LABEL, formatDate, formatDateTime } from "@/lib/status";
import { sairAcompanhamentoAction } from "@/lib/actions/acompanhamento-actions";
import { PublicShell } from "@/components/PublicShell";
import { EtapasStepper } from "@/components/EtapasStepper";
import type { Role } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Acompanhamento · CAPE Aprova", robots: { index: false } };

// O histórico é a conversa entre a CAPE e o RT. Para o proprietário importa de que lado
// veio cada movimentação, não o nome do analista.
function ladoDoEvento(autor: { role: Role; name: string } | null) {
  if (!autor || autor.role === "ADMIN_CAPE" || autor.role === "CAPE_ANALISTA") return { rotulo: "Equipe CAPE", cor: "#E01B22" };
  if (autor.role === "RESPONSAVEL_TECNICO") return { rotulo: `Responsável técnico · ${autor.name}`, cor: "#2E4653" };
  if (autor.role === "SINDICO") return { rotulo: "Síndico", cor: "#3B3486" };
  return { rotulo: "Proprietário", cor: "#7A7472" };
}

// Somente leitura, de propósito: nenhum documento, ação ou dado de contato aparece aqui —
// a senha alcança só o andamento e o histórico.
export default async function AcompanhamentoProtocoloPage({ params }: { params: Promise<{ protocolo: string }> }) {
  const protocolo = decodeURIComponent((await params).protocolo).toUpperCase();
  const voltar = `/acompanhar?protocolo=${encodeURIComponent(protocolo)}`;

  const sol = await prisma.solicitacao.findUnique({
    where: { protocolo },
    select: {
      id: true,
      protocolo: true,
      status: true,
      tipo: true,
      areaIntervencao: true,
      descricao: true,
      createdAt: true,
      documentacaoValidada: true,
      devolvidaNoChecklist: true,
      acompanhamentoSenhaCifrada: true,
      responsavelTecnicoNome: true,
      lote: { select: { numero: true, quadra: { select: { nome: true } }, empreendimento: { select: { nome: true, cidade: true, uf: true } } } },
      historico: {
        orderBy: { createdAt: "desc" },
        select: { id: true, texto: true, createdAt: true, autor: { select: { role: true, name: true } } },
      },
    },
  });
  if (!sol || sol.status === "RASCUNHO" || !sol.acompanhamentoSenhaCifrada) redirect(voltar);

  const token = (await cookies()).get(cookieAcompanhamento(sol.id))?.value;
  if (!tokenConfere(token, sol.id, sol.acompanhamentoSenhaCifrada)) redirect(voltar);

  const info = STATUS_INFO[sol.status];

  return (
    <PublicShell largura={820}>
      <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderLeft: `4px solid ${info.bg}`, borderRadius: 4, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "#7A7472" }}>Acompanhamento da solicitação</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 19, fontWeight: 600 }}>{sol.protocolo}</span>
          <span style={{ padding: "4px 10px", borderRadius: 3, fontSize: 12, fontWeight: 600, background: info.bg, color: info.fg }}>{info.label}</span>
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, lineHeight: 1.15 }}>
          {sol.lote.empreendimento.nome} · {sol.lote.quadra.nome} L{sol.lote.numero} — {TIPO_LABEL[sol.tipo]}
        </div>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontSize: 12.5, color: "#4A5563" }}>
          <span>Protocolado em {formatDate(sol.createdAt)}</span>
          <span>Área de intervenção: {sol.areaIntervencao.toLocaleString("pt-BR")} m²</span>
          {sol.responsavelTecnicoNome && <span>Responsável técnico: {sol.responsavelTecnicoNome}</span>}
        </div>
        <div style={{ fontSize: 12.5, color: "#7A7472", lineHeight: 1.5 }}>{sol.descricao}</div>
      </section>

      <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#7A7472" }}>Etapas da aprovação</div>
        <EtapasStepper etapas={etapasDaSolicitacao(sol)} />
      </section>

      <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#7A7472" }}>Histórico entre a CAPE e o responsável técnico</div>
        {sol.historico.length === 0 && <div style={{ fontSize: 12.5, color: "#7A7472" }}>Sem movimentações registradas ainda.</div>}
        {sol.historico.map((h) => {
          const lado = ladoDoEvento(h.autor);
          return (
            <div key={h.id} style={{ borderLeft: `3px solid ${lado.cor}`, paddingLeft: 12, display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: lado.cor }}>{lado.rotulo}</div>
              <div style={{ fontSize: 13, lineHeight: 1.45, color: "#231F20", whiteSpace: "pre-line" }}>{h.texto}</div>
              <div style={{ fontSize: 11, color: "#7A7472", fontFamily: "var(--font-mono)" }}>{formatDateTime(h.createdAt)}</div>
            </div>
          );
        })}
      </section>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#7A7472", maxWidth: "60ch", lineHeight: 1.45 }}>
          Tela somente de acompanhamento. Dúvidas sobre o projeto ou pendências: fale com o responsável técnico.
        </span>
        <form action={sairAcompanhamentoAction.bind(null, sol.id)}>
          <button type="submit" style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#4A5563", borderRadius: 4, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            Sair
          </button>
        </form>
      </div>
    </PublicShell>
  );
}

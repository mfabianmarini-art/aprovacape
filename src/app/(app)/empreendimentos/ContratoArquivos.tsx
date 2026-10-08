"use client";

import { useActionState } from "react";
import { excluirArquivosAposRescisaoAction, registrarRescisaoAction, type ContratoState } from "@/lib/actions/empreendimento-actions";
import { formatarTamanho } from "@/lib/arquivos-formato";
import { DIAS_DE_GUARDA_APOS_RESCISAO } from "@/lib/contrato";
import { formatDate } from "@/lib/status";

const rotulo: React.CSSProperties = { fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#7A7472" };
const input: React.CSSProperties = { border: "1px solid #DDD8CE", borderRadius: 4, padding: "8px 10px", fontSize: 12.5, background: "#fff" };

export function ContratoArquivos({
  empreendimentoId,
  nome,
  podeGerir,
  rescindidoEm,
  guardaAte,
  excluidosEm,
  prazoVencido,
  armazenamento,
}: {
  empreendimentoId: string;
  nome: string;
  podeGerir: boolean;
  rescindidoEm: string | null;
  guardaAte: string | null;
  excluidosEm: string | null;
  prazoVencido: boolean;
  armazenamento: { arquivos: number; bytes: number; versoes: number; bytesVersoes: number };
}) {
  const [estadoRescisao, registrar, registrando] = useActionState<ContratoState, FormData>(registrarRescisaoAction.bind(null, empreendimentoId), null);
  const [estadoExclusao, excluir, excluindo] = useActionState<ContratoState, FormData>(excluirArquivosAposRescisaoAction.bind(null, empreendimentoId), null);

  return (
    <section style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: "16px 17px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={rotulo}>Contrato e armazenamento</div>

      <div style={{ fontSize: 12.5, color: "#3B4653", lineHeight: 1.55 }}>
        <strong>{armazenamento.arquivos}</strong> arquivo(s) guardados · <strong>{formatarTamanho(armazenamento.bytes)}</strong>
        {armazenamento.versoes > 0 && (
          <span style={{ color: "#7A7472" }}>
            {" "}
            (dos quais {armazenamento.versoes} versões anteriores, {formatarTamanho(armazenamento.bytesVersoes)})
          </span>
        )}
      </div>

      {excluidosEm ? (
        <div style={{ fontSize: 12.5, color: "#8C2B22", lineHeight: 1.5 }}>Arquivos excluídos em {formatDate(new Date(excluidosEm))}, após o prazo contratual.</div>
      ) : rescindidoEm ? (
        <div style={{ fontSize: 12.5, color: "#6B4A11", background: "#FDF8EE", border: "1px solid #E8D7B4", borderRadius: 4, padding: "10px 12px", lineHeight: 1.5 }}>
          Contrato rescindido em {formatDate(new Date(rescindidoEm))}. A documentação fica disponível até{" "}
          <strong>{formatDate(new Date(guardaAte!))}</strong> ({DIAS_DE_GUARDA_APOS_RESCISAO} dias após a rescisão).
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "#4A5563", lineHeight: 1.5 }}>
          Contrato vigente. Toda a documentação — inclusive versões substituídas — fica guardada e disponível ao condomínio até{" "}
          {DIAS_DE_GUARDA_APOS_RESCISAO} dias após uma eventual rescisão.
        </div>
      )}

      {podeGerir && !excluidosEm && (
        <form action={registrar} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11.5, color: "#7A7472" }}>Data da rescisão (deixe vazio se o contrato está vigente)</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input type="date" name="data" defaultValue={rescindidoEm?.slice(0, 10) ?? ""} style={input} />
            <button type="submit" disabled={registrando} style={{ ...input, cursor: "pointer", fontWeight: 600, color: "#231F20" }}>
              {registrando ? "Salvando…" : "Salvar"}
            </button>
          </div>
          {estadoRescisao?.error && <span style={{ fontSize: 11.5, color: "#8C2B22" }}>{estadoRescisao.error}</span>}
          {estadoRescisao?.ok && <span style={{ fontSize: 11.5, color: "#24603A" }}>{estadoRescisao.ok}</span>}
        </form>
      )}

      {podeGerir && prazoVencido && !excluidosEm && (
        <form action={excluir} style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid #EDE9E1", paddingTop: 10 }}>
          <span style={{ fontSize: 11.5, color: "#8C2B22", lineHeight: 1.45 }}>
            Prazo de guarda encerrado. Para excluir definitivamente todos os arquivos deste empreendimento, digite <strong>{nome}</strong>.
            Não há como desfazer.
          </span>
          <input name="confirmacao" autoComplete="off" style={input} />
          <button type="submit" disabled={excluindo} style={{ ...input, cursor: "pointer", fontWeight: 600, color: "#fff", background: "#8C2B22", borderColor: "#8C2B22" }}>
            {excluindo ? "Excluindo…" : "Excluir arquivos definitivamente"}
          </button>
          {estadoExclusao?.error && <span style={{ fontSize: 11.5, color: "#8C2B22" }}>{estadoExclusao.error}</span>}
          {estadoExclusao?.ok && <span style={{ fontSize: 11.5, color: "#24603A" }}>{estadoExclusao.ok}</span>}
        </form>
      )}
    </section>
  );
}

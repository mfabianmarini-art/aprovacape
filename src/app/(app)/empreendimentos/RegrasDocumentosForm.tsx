"use client";

import { useActionState, useState } from "react";
import { salvarRegrasDocumentosAction, type RegrasDocumentosState } from "@/lib/actions/empreendimento-actions";
import { EXIGENCIA_LABEL } from "@/lib/status";
import type { DocumentoExigencia, DocumentoTipo } from "@/generated/prisma/enums";

export type LinhaRegra = { tipo: DocumentoTipo; nome: string; formatos: string; exigencia: DocumentoExigencia; padrao: DocumentoExigencia };

const OPCOES = Object.entries(EXIGENCIA_LABEL) as [DocumentoExigencia, string][];
const th: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472", textAlign: "left", fontWeight: 400, padding: "0 10px 8px 0" };

// O que o RT precisa anexar no passo 2 da nova solicitação, neste empreendimento.
export function RegrasDocumentosForm({
  empreendimentoId,
  linhas,
  ultimaAlteracao,
}: {
  empreendimentoId: string;
  linhas: LinhaRegra[];
  ultimaAlteracao: { nome: string | null; em: string } | null;
}) {
  const [state, formAction, pending] = useActionState(salvarRegrasDocumentosAction.bind(null, empreendimentoId), null as RegrasDocumentosState);
  const [valores, setValores] = useState<Record<string, DocumentoExigencia>>(() => Object.fromEntries(linhas.map((l) => [l.tipo, l.exigencia])));
  const alterado = linhas.some((l) => valores[l.tipo] !== l.exigencia);
  const foraDoPadrao = linhas.some((l) => valores[l.tipo] !== l.padrao);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 12.5, color: "#4A5563", lineHeight: 1.5, maxWidth: "80ch" }}>
        Defina o que o RT precisa anexar ao abrir uma solicitação neste empreendimento. Obrigatórios travam o envio e entram na
        conferência documental; opcionais ficam só para consulta; os não pedidos não aparecem para o RT.
      </div>
      <div style={{ fontSize: 12, color: "#8A5210", background: "#FBF5EA", border: "1px solid #EAD9BC", borderRadius: 4, padding: "9px 12px", lineHeight: 1.5, maxWidth: "80ch" }}>
        A mudança vale na hora, também para as solicitações em andamento. Se um documento passar a ser obrigatório, as que não o
        tiverem só concluem a conferência documental depois que o RT anexá-lo: devolva a documentação pedindo o documento.
      </div>

      <div className="table-scroll">
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr>
              <th style={th}>Documento</th>
              <th style={th}>Formato</th>
              <th style={th}>Exigência</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.tipo} style={{ borderTop: "1px solid #EDE9E1" }}>
                <td style={{ padding: "8px 10px 8px 0", fontSize: 13 }}>{l.nome}</td>
                <td style={{ padding: "8px 10px", fontSize: 12, fontFamily: "var(--font-mono)", color: "#4A5563", whiteSpace: "nowrap" }}>{l.formatos}</td>
                <td style={{ padding: "8px 0" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <select
                      name={`exigencia_${l.tipo}`}
                      aria-label={`Exigência de ${l.nome}`}
                      value={valores[l.tipo]}
                      onChange={(e) => setValores((v) => ({ ...v, [l.tipo]: e.target.value as DocumentoExigencia }))}
                      style={{ border: "1px solid #DDD8CE", borderRadius: 4, padding: "7px 9px", fontSize: 12.5, background: "#fff", minWidth: 250 }}
                    >
                      {OPCOES.map(([id, rotulo]) => (
                        <option key={id} value={id}>
                          {rotulo}
                        </option>
                      ))}
                    </select>
                    {valores[l.tipo] !== l.padrao && (
                      <span style={{ fontSize: 11, color: "#7A7472" }}>Padrão da plataforma: {EXIGENCIA_LABEL[l.padrao].toLowerCase()}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={pending || !alterado}
          style={{
            border: "1px solid #E01B22",
            background: alterado ? "#E01B22" : "#EDE9E1",
            borderColor: alterado ? "#E01B22" : "#EDE9E1",
            color: alterado ? "#fff" : "#8B939C",
            borderRadius: 4,
            padding: "9px 16px",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: alterado ? "pointer" : "default",
          }}
        >
          {pending ? "Salvando…" : "Salvar documentos exigidos"}
        </button>
        {foraDoPadrao && (
          <button
            type="button"
            onClick={() => setValores(Object.fromEntries(linhas.map((l) => [l.tipo, l.padrao])))}
            style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#4A5563", borderRadius: 4, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
          >
            Voltar ao padrão
          </button>
        )}
        {state?.ok && !alterado && <span style={{ fontSize: 12, color: "#24603A" }}>Salvo.</span>}
        {state?.error && <span style={{ fontSize: 12, color: "#8C2B22" }}>{state.error}</span>}
        {ultimaAlteracao && (
          <span style={{ fontSize: 11.5, color: "#7A7472", marginLeft: "auto" }}>
            Última alteração: {new Date(ultimaAlteracao.em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
            {ultimaAlteracao.nome ? ` · ${ultimaAlteracao.nome}` : ""}
          </span>
        )}
      </div>
    </form>
  );
}

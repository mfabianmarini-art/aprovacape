"use client";

import { useActionState, useState } from "react";
import {
  criarDocumentoPersonalizadoAction,
  excluirDocumentoPersonalizadoAction,
  salvarRegrasDocumentosAction,
  type RegrasDocumentosState,
} from "@/lib/actions/empreendimento-actions";
import { EXIGENCIA_LABEL, FORMATOS_PERSONALIZADOS, MAX_MB_PERSONALIZADO } from "@/lib/status";
import type { DocumentoExigencia } from "@/generated/prisma/enums";

// tipo: chave do documento. padrao: nulo nos criados pela CAPE, que não têm padrão.
export type LinhaRegra = {
  tipo: string;
  nome: string;
  formatos: string;
  exigencia: DocumentoExigencia;
  padrao: DocumentoExigencia | null;
  personalizado: { id: string; descricao: string | null; criadoPor: string | null } | null;
};

const OPCOES = Object.entries(EXIGENCIA_LABEL) as [DocumentoExigencia, string][];
const th: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472", textAlign: "left", fontWeight: 400, padding: "0 10px 8px 0" };
const campo: React.CSSProperties = { border: "1px solid #DDD8CE", borderRadius: 4, padding: "8px 10px", fontSize: 13, background: "#fff" };
const rotulo: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" };

function botaoPrincipal(ativo: boolean): React.CSSProperties {
  return {
    border: `1px solid ${ativo ? "#E01B22" : "#EDE9E1"}`,
    background: ativo ? "#E01B22" : "#EDE9E1",
    color: ativo ? "#fff" : "#8B939C",
    borderRadius: 4,
    padding: "9px 16px",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: ativo ? "pointer" : "default",
  };
}

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
  const [valores, setValores] = useState<Record<string, DocumentoExigencia>>({});
  const valor = (l: LinhaRegra) => valores[l.tipo] ?? l.exigencia;
  const alterado = linhas.some((l) => valor(l) !== l.exigencia);
  const foraDoPadrao = linhas.some((l) => l.padrao && valor(l) !== l.padrao);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
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
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
            <thead>
              <tr>
                <th style={th}>Documento</th>
                <th style={th}>Formato</th>
                <th style={th}>Exigência</th>
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.tipo} style={{ borderTop: "1px solid #EDE9E1", verticalAlign: "top" }}>
                  <td style={{ padding: "8px 10px 8px 0", fontSize: 13 }}>
                    {l.nome}
                    {l.personalizado && (
                      <div style={{ fontSize: 11, color: "#7A7472", marginTop: 2 }}>
                        Criado pela CAPE{l.personalizado.criadoPor ? ` · ${l.personalizado.criadoPor}` : ""}
                        {l.personalizado.descricao ? ` · ${l.personalizado.descricao}` : ""}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px", fontSize: 12, fontFamily: "var(--font-mono)", color: "#4A5563", whiteSpace: "nowrap" }}>{l.formatos}</td>
                  <td style={{ padding: "8px 10px 8px 0" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <select
                        name={`exigencia_${l.tipo}`}
                        aria-label={`Exigência de ${l.nome}`}
                        value={valor(l)}
                        onChange={(e) => setValores((v) => ({ ...v, [l.tipo]: e.target.value as DocumentoExigencia }))}
                        style={{ ...campo, padding: "7px 9px", fontSize: 12.5, minWidth: 250 }}
                      >
                        {OPCOES.map(([id, r]) => (
                          <option key={id} value={id}>
                            {r}
                          </option>
                        ))}
                      </select>
                      {l.padrao && valor(l) !== l.padrao && (
                        <span style={{ fontSize: 11, color: "#7A7472" }}>Padrão da plataforma: {EXIGENCIA_LABEL[l.padrao].toLowerCase()}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "8px 0", textAlign: "right" }}>
                    {l.personalizado && (
                      <button
                        type="submit"
                        formAction={excluirDocumentoPersonalizadoAction.bind(null, l.personalizado.id)}
                        formNoValidate
                        onClick={(e) => {
                          if (!window.confirm(`Excluir "${l.nome}"? O documento deixa de ser pedido; o que já foi enviado continua à vista.`)) e.preventDefault();
                        }}
                        style={{ border: 0, background: "none", color: "#8C2B22", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "7px 0" }}
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button type="submit" disabled={pending || !alterado} style={botaoPrincipal(alterado)}>
            {pending ? "Salvando…" : "Salvar exigências"}
          </button>
          {foraDoPadrao && (
            <button
              type="button"
              onClick={() => setValores((v) => ({ ...v, ...Object.fromEntries(linhas.filter((l) => l.padrao).map((l) => [l.tipo, l.padrao!])) }))}
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

      <NovoDocumento empreendimentoId={empreendimentoId} />
    </div>
  );
}

function NovoDocumento({ empreendimentoId }: { empreendimentoId: string }) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [formatos, setFormatos] = useState<string[]>(["pdf"]);
  const [maxMB, setMaxMB] = useState("5");
  const [exigencia, setExigencia] = useState<DocumentoExigencia>("OBRIGATORIO");
  const [state, formAction, pending] = useActionState(async (prev: RegrasDocumentosState, fd: FormData) => {
    const r = await criarDocumentoPersonalizadoAction(empreendimentoId, prev, fd);
    if (r?.ok) {
      setNome("");
      setDescricao("");
      setFormatos(["pdf"]);
      setMaxMB("5");
      setExigencia("OBRIGATORIO");
    }
    return r;
  }, null as RegrasDocumentosState);

  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid #EDE9E1", paddingTop: 18 }}
    >
      <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>Novo documento</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={rotulo}>Nome</span>
          <input name="nome" required minLength={3} maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} style={campo} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={rotulo}>Exigência</span>
          <select name="exigencia" value={exigencia} onChange={(e) => setExigencia(e.target.value as DocumentoExigencia)} style={campo}>
            {OPCOES.map(([id, r]) => (
              <option key={id} value={id}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={rotulo}>Tamanho máximo (MB)</span>
          <input
            name="maxMB"
            type="number"
            required
            min={1}
            max={MAX_MB_PERSONALIZADO}
            step={1}
            value={maxMB}
            onChange={(e) => setMaxMB(e.target.value)}
            style={{ ...campo, fontFamily: "var(--font-mono)" }}
          />
        </label>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <legend style={{ ...rotulo, marginBottom: 6 }}>Formatos aceitos</legend>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {FORMATOS_PERSONALIZADOS.map((f) => (
            <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                name="formatos"
                value={f.id}
                checked={formatos.includes(f.id)}
                onChange={(e) => setFormatos((atual) => (e.target.checked ? [...atual, f.id] : atual.filter((x) => x !== f.id)))}
              />
              {f.rotulo}
              <span style={{ fontSize: 11, color: "#8B939C", fontFamily: "var(--font-mono)" }}>{f.extensoes.join(" ")}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={rotulo}>Orientação ao RT (opcional)</span>
        <input
          name="descricao"
          maxLength={300}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: declaração assinada pelo proprietário, com firma reconhecida"
          style={campo}
        />
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="submit" disabled={pending || formatos.length === 0} style={botaoPrincipal(!pending && formatos.length > 0)}>
          {pending ? "Criando…" : "Criar documento"}
        </button>
        {formatos.length === 0 && <span style={{ fontSize: 12, color: "#8A5210" }}>Escolha ao menos um formato.</span>}
        {state?.ok && <span style={{ fontSize: 12, color: "#24603A" }}>Documento criado.</span>}
        {state?.error && <span style={{ fontSize: 12, color: "#8C2B22" }}>{state.error}</span>}
      </div>
    </form>
  );
}

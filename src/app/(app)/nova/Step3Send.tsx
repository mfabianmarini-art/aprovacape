"use client";

import { useActionState, useState } from "react";
import { enviarSolicitacaoAction } from "@/lib/actions/nova-actions";

const inputStyle: React.CSSProperties = { border: "1px solid #DDD8CE", borderRadius: 4, padding: "10px 11px", fontSize: 13.5 };
const labelTextStyle: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" };

const DECLARACOES = [
  { id: "d1", texto: "Declaro que a aprovação pela CAPE não substitui as aprovações legais junto aos órgãos públicos competentes, cabendo a mim e ao responsável técnico a regularidade legal da obra." },
  {
    id: "d2",
    texto:
      "Declaro ciência de que o início da obra depende da apresentação do projeto aprovado pela Prefeitura, do respectivo alvará de execução e da ART/RRT de execução da obra.",
  },
  { id: "d3", texto: "Declaro ciência de que alterações no projeto aprovado pela Prefeitura em relação ao aprovado pelo residencial exigem substituição do projeto." },
  {
    id: "d4",
    texto:
      "Declaro ciência de que é obrigatória a apresentação à CAPE da matrícula atualizada do imóvel assim que for liberado o TVO (Termo de Vistoria de Obra).",
  },
] as const;
type Decl = (typeof DECLARACOES)[number]["id"];

export type PerfilRT = { nome: string; email: string; registro: string };

function CamposRT({ prefixo, inicial }: { prefixo: "rt" | "rtExec"; inicial?: PerfilRT }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Nome</span>
        <input name={`${prefixo}Nome`} required defaultValue={inicial?.nome} style={inputStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Registro CAU / CREA</span>
        <input name={`${prefixo}Registro`} required defaultValue={inicial?.registro} style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>E-mail para notificações</span>
        <input name={`${prefixo}Email`} required type="email" defaultValue={inicial?.email} style={inputStyle} />
      </label>
    </div>
  );
}

export function Step3Send({ rascunho, perfilRT, emailProprietario }: { rascunho: { id: string }; perfilRT: PerfilRT; emailProprietario: string | null }) {
  const [state, formAction, pending] = useActionState(enviarSolicitacaoAction, null as { error?: string } | null);
  const [decl, setDecl] = useState<Record<Decl, boolean>>({ d1: false, d2: false, d3: false, d4: false });
  // Sem resposta pré-marcada: quem envia decide de propósito quem responde pela execução.
  const [mesmoRT, setMesmoRT] = useState<"sim" | "nao" | null>(null);
  const declaracoesOk = DECLARACOES.every((d) => decl[d.id]);
  const podeEnviar = declaracoesOk && mesmoRT !== null;

  return (
    <form action={formAction} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="hidden" name="solicitacaoId" value={rascunho.id} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={labelTextStyle}>Responsável técnico pelo projeto</span>
        <span style={{ fontSize: 11.5, color: "#7A7472" }}>Preenchido com os dados do seu cadastro. Ajuste se necessário.</span>
        <CamposRT prefixo="rt" inicial={perfilRT} />
      </div>

      <fieldset style={{ border: "1px solid #EDE9E1", borderRadius: 4, padding: "14px 16px", margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <legend style={{ ...labelTextStyle, padding: "0 6px" }}>Responsável técnico pela execução</legend>
        <span style={{ fontSize: 13, color: "#231F20", fontWeight: 600 }}>O responsável pelo projeto também será o responsável pela execução da obra?</span>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {(
            [
              ["sim", "Sim, sou eu também"],
              ["nao", "Não, é outro profissional"],
            ] as const
          ).map(([v, rotulo]) => (
            <label key={v} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, cursor: "pointer" }}>
              <input
                type="radio"
                name="mesmoRTExecucao"
                value={v}
                required
                checked={mesmoRT === v}
                onChange={() => setMesmoRT(v)}
                style={{ width: 16, height: 16, accentColor: "#E01B22", cursor: "pointer" }}
              />
              {rotulo}
            </label>
          ))}
        </div>
        {mesmoRT === "sim" && (
          <span style={{ fontSize: 12, color: "#24603A", lineHeight: 1.45 }}>
            Os dados do responsável pelo projeto valem também para a execução — nada a preencher.
          </span>
        )}
        {mesmoRT === "nao" && <CamposRT prefixo="rtExec" />}
      </fieldset>

      {/* O e-mail é informado no passo 1; aqui só aparece para rascunhos criados antes disso. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 460 }}>
        <span style={labelTextStyle}>E-mail do proprietário</span>
        {emailProprietario ? (
          <span style={{ fontSize: 13.5 }}>{emailProprietario}</span>
        ) : (
          <input name="proprietarioEmail" required type="email" style={inputStyle} />
        )}
        <span style={{ fontSize: 11.5, color: "#7A7472", lineHeight: 1.45 }}>
          Ao enviar, o proprietário recebe automaticamente neste e-mail o protocolo e a senha para acompanhar a aprovação — e
          você, uma cópia.
        </span>
      </div>

      <div style={{ background: "#FAF9F6", border: "1px solid #EDE9E1", borderRadius: 4, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={labelTextStyle}>Declarações obrigatórias</div>
        {DECLARACOES.map((d) => (
          <label key={d.id} style={{ display: "grid", gridTemplateColumns: "18px 1fr", gap: 10, alignItems: "start", cursor: "pointer" }}>
            <input
              type="checkbox"
              name={d.id}
              checked={decl[d.id]}
              onChange={(e) => setDecl((s) => ({ ...s, [d.id]: e.target.checked }))}
              style={{ width: 16, height: 16, marginTop: 2, accentColor: "#E01B22", cursor: "pointer" }}
            />
            <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "#3B4653" }}>{d.texto}</span>
          </label>
        ))}
      </div>

      {state?.error && <div style={{ fontSize: 12.5, color: "#8C2B22" }}>{state.error}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12.5, color: podeEnviar ? "#24603A" : "#8A5210", maxWidth: "60ch", lineHeight: 1.45 }}>
          {podeEnviar
            ? "Pronto para envio."
            : mesmoRT === null
              ? "Informe quem é o responsável pela execução e aceite as declarações para enviar."
              : `Aceite as ${DECLARACOES.length} declarações para enviar.`}
        </div>
        <div style={{ display: "flex", gap: 9 }}>
          <a
            href={`/nova?rascunho=${rascunho.id}&passo=2`}
            style={{ border: "1px solid #DDD8CE", background: "#fff", color: "#E01B22", borderRadius: 4, padding: "10px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
          >
            Voltar
          </a>
          <button
            type="submit"
            disabled={!podeEnviar || pending}
            style={{
              border: "1px solid #E01B22",
              background: podeEnviar ? "#E01B22" : "#EDE9E1",
              color: podeEnviar ? "#FFFFFF" : "#8B939C",
              borderRadius: 4,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: podeEnviar ? "pointer" : "not-allowed",
            }}
          >
            {pending ? "Enviando…" : "Enviar solicitação"}
          </button>
        </div>
      </div>
    </form>
  );
}

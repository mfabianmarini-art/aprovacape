"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  loginAction,
  registerAction,
  loginAndRedirectAction,
  type LoginState,
  type RegisterState,
} from "@/lib/actions/auth-actions";

type Empreendimento = {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  quadras: { id: string; nome: string; lotes: { id: string; numero: string }[] }[];
};

const inputStyle: React.CSSProperties = {
  border: "1px solid #DDD8CE",
  borderRadius: 4,
  padding: "11px 12px",
  fontSize: 13.5,
};
const labelTextStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: ".13em",
  textTransform: "uppercase",
  color: "#7A7472",
};

export function LoginRegisterForm({ empreendimentos }: { empreendimentos: Empreendimento[] }) {
  const [aba, setAba] = useState<"cadastro" | "login">("login");
  const [cadTipo, setCadTipo] = useState<"prop" | "rt">("prop");
  const [empId, setEmpId] = useState(empreendimentos[0]?.id ?? "");
  const emp = empreendimentos.find((e) => e.id === empId) ?? empreendimentos[0];
  const [quadraId, setQuadraId] = useState(emp?.quadras[0]?.id ?? "");
  const quadra = emp?.quadras.find((q) => q.id === quadraId) ?? emp?.quadras[0];
  const [aceite, setAceite] = useState(false);

  const [loginState, loginFormAction, loginPending] = useActionState<LoginState, FormData>(loginAction, null);
  const [registerState, registerFormAction, registerPending] = useActionState<RegisterState, FormData>(
    registerAction,
    null,
  );
  const router = useRouter();
  const [entering, startEntering] = useTransition();

  useEffect(() => {
    if (loginState?.redirectTo) router.push(loginState.redirectTo);
  }, [loginState, router]);

  function handleEntrar() {
    if (!registerState?.ok) return;
    startEntering(async () => {
      const to = await loginAndRedirectAction(registerState.identifier!, registerState.password!);
      router.push(to);
    });
  }

  const pronto = aceite;

  if (registerState?.ok) {
    return (
      <Shell>
        <div
          style={{
            background: "#fff",
            border: "1px solid #C6DAC9",
            borderTop: "3px solid #24603A",
            borderRadius: 4,
            padding: 26,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, lineHeight: 1.1 }}>
            Cadastro enviado
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "#3B4653" }}>
            Sua conta foi criada para <strong>{registerState.identifier}</strong> e já está pronta para uso.
          </div>
          <div
            style={{
              background: "#FDF8EE",
              border: "1px solid #E8D7B4",
              borderRadius: 4,
              padding: "14px 16px",
              fontSize: 12.5,
              lineHeight: 1.55,
              color: "#6B4A11",
            }}
          >
            Ao entrar você já pode abrir uma nova solicitação de obra para o lote informado. A CAPE confere o
            vínculo em paralelo e entra em contato caso a comprovação não corresponda ao lote.
          </div>
          <button
            onClick={handleEntrar}
            disabled={entering}
            style={{
              border: "1px solid #E01B22",
              background: "#E01B22",
              color: "#fff",
              borderRadius: 4,
              padding: "12px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {entering ? "Entrando…" : "Entrar na plataforma"}
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4 }}>
        <div style={{ display: "flex", borderBottom: "1px solid #EDE9E1" }}>
          {(
            [
              ["login", "Já tenho conta"],
              ["cadastro", "Criar conta"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              style={{
                flex: 1,
                border: 0,
                borderBottom: `3px solid ${aba === id ? "#E01B22" : "transparent"}`,
                background: "#fff",
                padding: "15px 10px",
                fontSize: 13,
                fontWeight: 600,
                color: aba === id ? "#231F20" : "#7A7472",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {aba === "login" && (
          <form action={loginFormAction} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={labelTextStyle}>E-mail ou CPF</span>
              <input name="identifier" required style={inputStyle} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={labelTextStyle}>Senha</span>
              <input name="password" type="password" required style={inputStyle} />
            </label>
            {loginState?.error && (
              <div style={{ fontSize: 12.5, color: "#8C2B22" }}>{loginState.error}</div>
            )}
            <button
              type="submit"
              disabled={loginPending}
              style={{
                border: "1px solid #E01B22",
                background: "#E01B22",
                color: "#fff",
                borderRadius: 4,
                padding: "12px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {loginPending ? "Entrando…" : "Entrar"}
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 12.5 }}>
              <span style={{ color: "#7A7472" }}>Esqueci minha senha</span>
              <button
                type="button"
                onClick={() => setAba("cadastro")}
                style={{ border: 0, background: "transparent", color: "#E01B22", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}
              >
                Primeiro acesso? Criar conta
              </button>
            </div>
          </form>
        )}

        {aba === "cadastro" && (
          <form action={registerFormAction} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={labelTextStyle}>Eu sou</span>
              <div style={{ display: "flex", gap: 8 }}>
                {(
                  [
                    ["prop", "Proprietário do lote"],
                    ["rt", "Responsável técnico"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCadTipo(id)}
                    style={{
                      flex: 1,
                      border: `1px solid ${cadTipo === id ? "#E01B22" : "#DDD8CE"}`,
                      background: cadTipo === id ? "#E01B22" : "#FFFFFF",
                      color: cadTipo === id ? "#FFFFFF" : "#4A5563",
                      borderRadius: 4,
                      padding: "11px 10px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <input type="hidden" name="tipo" value={cadTipo} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1/-1" }}>
                <span style={labelTextStyle}>Nome completo</span>
                <input name="nome" required placeholder="Como consta no documento" style={inputStyle} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelTextStyle}>CPF</span>
                <input name="cpf" required placeholder="000.000.000-00" style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelTextStyle}>Data de nascimento</span>
                <input name="nascimento" required type="date" style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelTextStyle}>Telefone</span>
                <input name="telefone" required placeholder="(11) 90000-0000" style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelTextStyle}>E-mail</span>
                <input name="email" required type="email" style={inputStyle} />
              </label>
              {cadTipo === "rt" && (
                <div style={{ display: "grid", gridTemplateColumns: "110px minmax(0,1fr) 90px", gap: 10, gridColumn: "1/-1" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={labelTextStyle}>Conselho</span>
                    <select name="conselho" required defaultValue="CREA" style={{ ...inputStyle, border: "1px solid #B4711A" }}>
                      <option value="CREA">CREA</option>
                      <option value="CAU">CAU</option>
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={labelTextStyle}>Número do registro</span>
                    <input
                      name="registroNumero"
                      required
                      placeholder="5069874/D"
                      style={{ ...inputStyle, border: "1px solid #B4711A", fontFamily: "var(--font-mono)" }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={labelTextStyle}>UF emissora</span>
                    <input
                      name="registroUf"
                      required
                      maxLength={2}
                      placeholder="SP"
                      style={{ ...inputStyle, border: "1px solid #B4711A", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}
                    />
                  </label>
                </div>
              )}
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelTextStyle}>Senha</span>
                <input name="senha" required type="password" placeholder="mínimo 8 caracteres" style={inputStyle} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelTextStyle}>Confirmar senha</span>
                <input name="confirmarSenha" required type="password" style={inputStyle} />
              </label>
            </div>

            <div style={{ border: "1px solid #DDD8CE", borderRadius: 4, padding: 16, display: "flex", flexDirection: "column", gap: 12, background: "#FAF9F6" }}>
              <div style={labelTextStyle}>Vínculo com o lote</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px", gap: 10 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ ...labelTextStyle, fontSize: 10.5 }}>Empreendimento</span>
                  <select
                    value={empId}
                    onChange={(e) => {
                      setEmpId(e.target.value);
                      const next = empreendimentos.find((x) => x.id === e.target.value);
                      setQuadraId(next?.quadras[0]?.id ?? "");
                    }}
                    style={{ ...inputStyle, padding: "10px 11px", background: "#fff" }}
                  >
                    {empreendimentos.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nome} — {e.cidade}/{e.uf}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ ...labelTextStyle, fontSize: 10.5 }}>Quadra</span>
                  <select value={quadraId} onChange={(e) => setQuadraId(e.target.value)} style={{ ...inputStyle, padding: "10px 8px", background: "#fff" }}>
                    {emp?.quadras.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ ...labelTextStyle, fontSize: 10.5 }}>Lote</span>
                  <select name="loteId" style={{ ...inputStyle, padding: "10px 8px", background: "#fff" }}>
                    {quadra?.lotes.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.numero}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ ...labelTextStyle, fontSize: 10.5 }}>
                  {cadTipo === "rt" ? "Autorização do proprietário" : "Matrícula do lote ou código de convite"}
                </span>
                {cadTipo === "rt" ? (
                  <>
                    <input
                      name="autorizacao"
                      type="file"
                      required
                      accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp"
                      style={{ ...inputStyle, background: "#fff", fontSize: 12.5 }}
                    />
                    <span style={{ fontSize: 11.5, color: "#7A7472" }}>
                      Procuração ou contrato assinado pelo proprietário — PDF, Word ou imagem, até 10 MB.
                    </span>
                  </>
                ) : (
                  <input
                    name="comprovacao"
                    required
                    placeholder="000.000 / CONV-0000"
                    style={{ ...inputStyle, background: "#fff" }}
                  />
                )}
              </label>
              <div style={{ fontSize: 12, lineHeight: 1.5, color: "#4A5563" }}>
                {cadTipo === "rt"
                  ? "O responsável técnico é vinculado ao lote pelo proprietário ou por documento de autorização. A CAPE confere antes de liberar o envio de projetos."
                  : "Use a matrícula do lote ou o código de convite enviado pela administração do residencial. A CAPE confere o vínculo em paralelo ao seu acesso."}
              </div>
            </div>

            <label style={{ display: "grid", gridTemplateColumns: "18px 1fr", gap: 10, alignItems: "start", cursor: "pointer" }}>
              <input
                type="checkbox"
                name="aceite"
                checked={aceite}
                onChange={(e) => setAceite(e.target.checked)}
                style={{ width: 15, height: 15, marginTop: 2, accentColor: "#E01B22", cursor: "pointer" }}
              />
              <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "#3B4653" }}>
                Declaro que os dados informados são verdadeiros e autorizo a CAPE a tratá-los para a análise de
                projetos, conforme as normativas do residencial.
              </span>
            </label>

            {registerState?.error && <div style={{ fontSize: 12.5, color: "#8C2B22" }}>{registerState.error}</div>}

            <button
              type="submit"
              disabled={!pronto || registerPending}
              style={{
                border: "1px solid #E01B22",
                background: pronto ? "#E01B22" : "#EDE9E1",
                color: pronto ? "#FFFFFF" : "#8B939C",
                borderRadius: 4,
                padding: "13px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: pronto ? "pointer" : "not-allowed",
              }}
            >
              {registerPending ? "Enviando…" : "Criar conta"}
            </button>
          </form>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F4F2ED",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        gap: 24,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
        <Image src="/cape-logo.png" alt="CAPE" width={76} height={76} priority style={{ display: "block" }} />
        <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "#7A7472" }}>
          Aprova · Obras em lotes
        </div>
      </div>
      <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 20 }}>{children}</div>
    </div>
  );
}

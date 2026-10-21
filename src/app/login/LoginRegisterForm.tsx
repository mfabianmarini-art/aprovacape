"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  loginAction,
  registerAction,
  type LoginState,
  type RegisterState,
} from "@/lib/actions/auth-actions";
import { PublicShell as Shell } from "@/components/PublicShell";

// Largura e tamanho da fonte dos campos vêm de .form-publica (globals.css), que muda no celular.
const inputStyle: React.CSSProperties = {
  border: "1px solid #DDD8CE",
  borderRadius: 4,
  padding: "11px 12px",
};
const labelTextStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: ".13em",
  textTransform: "uppercase",
  color: "#7A7472",
};

export function LoginRegisterForm({ senhaRedefinida = false }: { senhaRedefinida?: boolean }) {
  const [aba, setAba] = useState<"cadastro" | "login">("login");
  const [aceite, setAceite] = useState(false);

  const [loginState, loginFormAction, loginPending] = useActionState<LoginState, FormData>(loginAction, null);
  const [registerState, registerFormAction, registerPending] = useActionState<RegisterState, FormData>(
    registerAction,
    null,
  );
  const router = useRouter();
  const [entering, startEntering] = useTransition();
  const [, startEnvio] = useTransition();
  const formCadastro = useRef<HTMLFormElement>(null);

  // Envio sem <form action>: com action, o React limpa o formulário ao terminar, e um erro
  // num campo apagava todos os outros. Assim o que foi digitado fica, e só o campo com
  // problema precisa ser corrigido.
  function enviarSemLimpar(despachar: (fd: FormData) => void) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      startEnvio(() => despachar(fd));
    };
  }

  // Leva o foco ao campo recusado.
  useEffect(() => {
    if (registerState?.campo) formCadastro.current?.querySelector<HTMLElement>(`[name="${registerState.campo}"]`)?.focus();
  }, [registerState]);
  const campoComErro = registerState?.campo;
  const destaque = (nome: string, base: React.CSSProperties = inputStyle): React.CSSProperties =>
    campoComErro === nome ? { ...base, border: "2px solid #8C2B22", background: "#FDF6F5" } : base;

  useEffect(() => {
    if (loginState?.redirectTo) router.push(loginState.redirectTo);
  }, [loginState, router]);

  function handleEntrar() {
    if (!registerState?.ok) return;
    // A conta já entrou no cadastro (registerAction). Recém-criada não tem lote: o
    // próximo passo é pedir o vínculo, não a home.
    startEntering(() => router.push("/vinculo"));
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
            Conta criada
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
            Ao entrar, o próximo passo é pedir o vínculo com o seu lote. A CAPE analisa o pedido e, aprovado, o
            lote passa a aparecer em Nova solicitação.
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
            {entering ? "Entrando…" : "Entrar e pedir vínculo com o lote"}
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
          <form onSubmit={enviarSemLimpar(loginFormAction)} className="form-publica" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {senhaRedefinida && (
              <div role="status" style={{ background: "#F6FAF7", border: "1px solid #C6DAC9", borderRadius: 4, padding: "10px 12px", fontSize: 12.5, color: "#24603A", lineHeight: 1.5 }}>
                Senha redefinida. Entre com a nova senha.
              </div>
            )}
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
              <Link href="/esqueci-senha" style={{ color: "#4A5563", fontWeight: 600 }}>
                Esqueci minha senha
              </Link>
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
          <form ref={formCadastro} onSubmit={enviarSemLimpar(registerFormAction)} className="form-publica" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#4A5563" }}>
              Cadastro de <strong>responsáveis técnicos</strong>, que abrem e acompanham as solicitações de obra. O
              proprietário não precisa de conta: acompanha a aprovação com o protocolo e a senha que o RT repassa.
            </div>

            <div className="cadastro-grid">
              <label className="cadastro-largo" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelTextStyle}>Nome completo</span>
                <input name="nome" required placeholder="Como consta no documento" style={destaque("nome")} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelTextStyle}>CPF</span>
                <input name="cpf" required placeholder="000.000.000-00" style={destaque("cpf", { ...inputStyle, fontFamily: "var(--font-mono)" })} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelTextStyle}>Telefone</span>
                <input name="telefone" required placeholder="(11) 90000-0000" style={destaque("telefone", { ...inputStyle, fontFamily: "var(--font-mono)" })} />
              </label>
              <label className="cadastro-largo" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelTextStyle}>E-mail</span>
                <input name="email" required type="email" autoComplete="email" style={destaque("email")} />
              </label>
              {/* Na ordem em que o registro se escreve: CREA-SP 5069874/D. */}
              <div className="cadastro-registro">
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={labelTextStyle}>Conselho</span>
                  <select name="conselho" required defaultValue="CREA" style={destaque("conselho", { ...inputStyle, border: "1px solid #B4711A", background: "#fff" })}>
                    <option value="CREA">CREA</option>
                    <option value="CAU">CAU</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={labelTextStyle}>UF emissora</span>
                  <input
                    name="registroUf"
                    required
                    maxLength={2}
                    placeholder="SP"
                    style={destaque("registroUf", { ...inputStyle, border: "1px solid #B4711A", fontFamily: "var(--font-mono)", textTransform: "uppercase" })}
                  />
                </label>
                <label className="cadastro-registro-numero" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={labelTextStyle}>Número do registro</span>
                  <input
                    name="registroNumero"
                    required
                    placeholder="5069874/D"
                    style={destaque("registroNumero", { ...inputStyle, border: "1px solid #B4711A", fontFamily: "var(--font-mono)" })}
                  />
                </label>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelTextStyle}>Senha</span>
                <input name="senha" required type="password" placeholder="mínimo 8 caracteres" style={destaque("senha")} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelTextStyle}>Confirmar senha</span>
                <input name="confirmarSenha" required type="password" style={destaque("confirmarSenha")} />
              </label>
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
              O vínculo com o lote é pedido depois, já dentro da plataforma, em uma tela própria. Assim você
              cria a conta agora e pede o vínculo quando tiver a documentação do lote em mãos.
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

            {registerState?.error && (
              <div role="alert" style={{ fontSize: 12.5, color: "#8C2B22" }}>
                {registerState.error} Os demais dados continuam preenchidos.
              </div>
            )}

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

      <Link
        href="/acompanhar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          background: "#fff",
          border: "1px solid #DDD8CE",
          borderRadius: 4,
          padding: "15px 18px",
          textDecoration: "none",
          color: "#231F20",
        }}
      >
        <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>Sou proprietário do lote</span>
          <span style={{ fontSize: 12, color: "#4A5563", lineHeight: 1.45 }}>
            Acompanhe a aprovação da sua obra com o protocolo e a senha recebidos do responsável técnico.
          </span>
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#E01B22", whiteSpace: "nowrap" }}>Acompanhar →</span>
      </Link>
    </Shell>
  );
}

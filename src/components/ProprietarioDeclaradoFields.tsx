import type { CSSProperties } from "react";

// Bloco compartilhado pelos dois formulários que abrem pedido de vínculo de RT
// (cadastro no login e tela de vínculo). Sem estado: só os campos, com os estilos de
// quem o usa, para os dois pedirem exatamente os mesmos dados.
export function ProprietarioDeclaradoFields({
  inputStyle,
  labelStyle,
}: {
  inputStyle: CSSProperties;
  labelStyle: CSSProperties;
}) {
  const mono = { ...inputStyle, fontFamily: "var(--font-mono)" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11.5, color: "#7A7472", lineHeight: 1.5 }}>
        Dados do proprietário que assinou a autorização. A CAPE confere o documento contra estes dados
        antes de aprovar o vínculo.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelStyle}>Nome do proprietário</span>
          <input name="propNome" required placeholder="Como consta no documento" style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelStyle}>CPF do proprietário</span>
          <input name="propCpf" required placeholder="000.000.000-00" style={mono} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelStyle}>E-mail do proprietário</span>
          <input name="propEmail" required type="email" style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelStyle}>Telefone do proprietário</span>
          <input name="propTelefone" required placeholder="(11) 90000-0000" style={mono} />
        </label>
      </div>
    </div>
  );
}

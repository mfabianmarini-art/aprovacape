"use client";

import { Fragment, type CSSProperties } from "react";

export type TipoPessoa = "PF" | "PJ";

// Bloco do pedido de vínculo do RT com os dados do proprietário. O tipo (pessoa física ou
// jurídica) fica com quem usa o bloco, porque muda também o rótulo do documento de
// identidade anexado — numa empresa, é o do responsável legal que assina a procuração.
export function ProprietarioDeclaradoFields({
  inputStyle,
  labelStyle,
  tipo,
  onTipo,
}: {
  inputStyle: CSSProperties;
  labelStyle: CSSProperties;
  tipo: TipoPessoa;
  onTipo: (t: TipoPessoa) => void;
}) {
  const mono = { ...inputStyle, fontFamily: "var(--font-mono)" };
  const pj = tipo === "PJ";
  const campo = (rotulo: string, input: React.ReactNode) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={labelStyle}>{rotulo}</span>
      {input}
    </label>
  );
  const opcao = (valor: TipoPessoa, rotulo: string) => (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
      <input type="radio" name="propTipo" value={valor} checked={tipo === valor} onChange={() => onTipo(valor)} />
      {rotulo}
    </label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11.5, color: "#7A7472", lineHeight: 1.5 }}>
        {pj
          ? "Dados da empresa proprietária e do responsável legal que assinou a procuração. A CAPE confere o documento contra estes dados antes de aprovar o vínculo."
          : "Dados do proprietário que assinou a procuração. A CAPE confere o documento contra estes dados antes de aprovar o vínculo."}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
        <span style={labelStyle}>O proprietário é</span>
        {opcao("PF", "Pessoa física")}
        {opcao("PJ", "Pessoa jurídica")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
        {/* key: trocar o tipo recria os campos de identificação, para um CPF não acabar no lugar do CNPJ */}
        {pj ? (
          <Fragment key="pj">
            {campo("Razão social", <input name="propNome" required placeholder="Como consta no CNPJ" style={inputStyle} />)}
            {campo("CNPJ", <input name="propCnpj" required placeholder="00.000.000/0000-00" style={mono} />)}
            {campo("Responsável legal", <input name="propRepNome" required placeholder="Quem assina pela empresa" style={inputStyle} />)}
            {campo("CPF do responsável legal", <input name="propRepCpf" required placeholder="000.000.000-00" style={mono} />)}
          </Fragment>
        ) : (
          <Fragment key="pf">
            {campo("Nome do proprietário", <input name="propNome" required placeholder="Como consta no documento" style={inputStyle} />)}
            {campo("CPF do proprietário", <input name="propCpf" required placeholder="000.000.000-00" style={mono} />)}
          </Fragment>
        )}
        {campo(pj ? "E-mail da empresa" : "E-mail do proprietário", <input name="propEmail" required type="email" style={inputStyle} />)}
        {campo(pj ? "Telefone da empresa" : "Telefone do proprietário", <input name="propTelefone" required placeholder="(11) 90000-0000" style={mono} />)}
      </div>
    </div>
  );
}

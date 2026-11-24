import { z } from "zod";
import { cpfValido, digitosCpf } from "@/lib/cpf";
import { cnpjValido, normalizarCnpj } from "@/lib/cnpj";

// Dados do proprietário que o responsável técnico declara ao pedir vínculo. A
// procuração que ele anexa é um documento assinado; sem saber de quem é a assinatura,
// a CAPE não tem contra quem conferi-la. Os dois formulários que abrem um pedido
// (cadastro no login e tela de vínculo) coletam os mesmos campos, então a regra de
// validação mora aqui e não em cada um.
//
// O proprietário pode ser pessoa jurídica (propTipo "PJ"): propNome passa a ser a razão
// social, o CPF dá lugar ao CNPJ e entra o responsável legal, que assina a procuração.
export const camposProprietarioDeclarado = {
  propTipo: z.enum(["PF", "PJ"]).optional(),
  propNome: z.string().trim().optional(),
  propCpf: z.string().trim().optional(),
  propCnpj: z.string().trim().optional(),
  propRepNome: z.string().trim().optional(),
  propRepCpf: z.string().trim().optional(),
  propEmail: z.string().trim().optional(),
  propTelefone: z.string().trim().optional(),
};

export type ProprietarioDeclarado = {
  propTipo?: "PF" | "PJ";
  propNome?: string;
  propCpf?: string;
  propCnpj?: string;
  propRepNome?: string;
  propRepCpf?: string;
  propEmail?: string;
  propTelefone?: string;
};

// Primeira mensagem de erro, ou null quando está tudo preenchido.
export function proprietarioDeclaradoInvalido(d: ProprietarioDeclarado): string | null {
  if (d.propTipo === "PJ") {
    if (!d.propNome || d.propNome.length < 3) return "Informe a razão social do proprietário.";
    if (!cnpjValido(d.propCnpj ?? "")) return "CNPJ do proprietário inválido — confira os caracteres.";
    if (!d.propRepNome || d.propRepNome.length < 3) return "Informe o nome completo do responsável legal da empresa.";
    if (!cpfValido(d.propRepCpf ?? "")) return "CPF do responsável legal inválido — confira os números.";
  } else {
    if (!d.propNome || d.propNome.length < 3) return "Informe o nome completo do proprietário.";
    if (!cpfValido(d.propCpf ?? "")) return "CPF do proprietário inválido — confira os números.";
  }
  if (!z.string().email().safeParse(d.propEmail ?? "").success) return "Informe um e-mail válido do proprietário.";
  if ((d.propTelefone ?? "").replace(/\D/g, "").length < 10) return "Informe o telefone do proprietário, com DDD.";
  return null;
}

// O slot vinculo* do User é reaproveitado a cada pedido, então um pedido de proprietário
// precisa apagar o que um pedido anterior de RT deixou. O CPF vai só em dígitos, para
// poder ser comparado com o do proprietário cadastrado no lote.
// Só os campos do tipo escolhido: quem trocou de PF para PJ no formulário não deixa um
// CPF solto ao lado do CNPJ.
export function dadosProprietarioParaGravar(d: ProprietarioDeclarado, ehRT: boolean) {
  const pj = ehRT && d.propTipo === "PJ";
  const pf = ehRT && !pj;
  return {
    vinculoPropNome: ehRT ? (d.propNome ?? null) : null,
    vinculoPropCpf: pf && d.propCpf ? digitosCpf(d.propCpf) : null,
    vinculoPropCnpj: pj && d.propCnpj ? normalizarCnpj(d.propCnpj) : null,
    vinculoPropRepresentanteNome: pj ? (d.propRepNome ?? null) : null,
    vinculoPropRepresentanteCpf: pj && d.propRepCpf ? digitosCpf(d.propRepCpf) : null,
    vinculoPropEmail: ehRT ? (d.propEmail ?? null) : null,
    vinculoPropTelefone: ehRT ? (d.propTelefone ?? null) : null,
  };
}

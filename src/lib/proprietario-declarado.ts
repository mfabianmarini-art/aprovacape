import { z } from "zod";

// Dados do proprietário que o responsável técnico declara ao pedir vínculo. A
// autorização que ele anexa é um documento assinado; sem saber de quem é a assinatura,
// a CAPE não tem contra quem conferi-la. Os dois formulários que abrem um pedido
// (cadastro no login e tela de vínculo) coletam os mesmos campos, então a regra de
// validação mora aqui e não em cada um.
export const camposProprietarioDeclarado = {
  propNome: z.string().trim().optional(),
  propCpf: z.string().trim().optional(),
  propEmail: z.string().trim().optional(),
  propTelefone: z.string().trim().optional(),
};

export type ProprietarioDeclarado = {
  propNome?: string;
  propCpf?: string;
  propEmail?: string;
  propTelefone?: string;
};

const digitos = (s: string) => s.replace(/\D/g, "");

// Primeira mensagem de erro, ou null quando está tudo preenchido.
export function proprietarioDeclaradoInvalido(d: ProprietarioDeclarado): string | null {
  if (!d.propNome || d.propNome.length < 3) return "Informe o nome completo do proprietário.";
  if (digitos(d.propCpf ?? "").length !== 11) return "Informe o CPF do proprietário.";
  if (!z.string().email().safeParse(d.propEmail ?? "").success) return "Informe um e-mail válido do proprietário.";
  if (digitos(d.propTelefone ?? "").length < 10) return "Informe o telefone do proprietário, com DDD.";
  return null;
}

// O slot vinculo* do User é reaproveitado a cada pedido, então um pedido de proprietário
// precisa apagar o que um pedido anterior de RT deixou.
export function dadosProprietarioParaGravar(d: ProprietarioDeclarado, ehRT: boolean) {
  return {
    vinculoPropNome: ehRT ? (d.propNome ?? null) : null,
    vinculoPropCpf: ehRT ? (d.propCpf ?? null) : null,
    vinculoPropEmail: ehRT ? (d.propEmail ?? null) : null,
    vinculoPropTelefone: ehRT ? (d.propTelefone ?? null) : null,
  };
}

import type { Prisma } from "@/generated/prisma/client";
import { digitosCpf } from "@/lib/cpf";

// O login aceita e-mail ou CPF, e o CPF é gravado só em dígitos. Quem digita com pontos
// e traço precisa entrar do mesmo jeito, então a busca considera as duas formas.
export function ondeIdentificador(identifier: string): Prisma.UserWhereInput {
  const digitos = digitosCpf(identifier);
  const porCpf = digitos.length === 11 ? [{ cpf: digitos }] : [];
  return { OR: [{ email: identifier }, { cpf: identifier }, ...porCpf] };
}

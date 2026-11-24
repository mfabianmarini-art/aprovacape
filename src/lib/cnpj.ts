import { digitosCpf, formatarCpf } from "@/lib/cpf";

// CNPJ gravado sem máscara, em maiúsculas. Desde julho de 2026 a Receita emite CNPJ
// alfanumérico: as 12 primeiras posições podem ter letras, e só os dois dígitos
// verificadores continuam numéricos. Por isso a normalização guarda letras e números,
// e não só dígitos como no CPF.
export function normalizarCnpj(valor: string): string {
  return valor.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function formatarCnpj(valor: string): string {
  const c = normalizarCnpj(valor);
  if (c.length !== 14) return valor;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

// Dígitos verificadores (módulo 11). Cada caractere vale o código ASCII menos 48 — para
// os algarismos é o próprio número, então a mesma conta serve ao CNPJ antigo e ao
// alfanumérico. Como no CPF, derruba erro de digitação, não prova que a empresa existe.
export function cnpjValido(valor: string): boolean {
  const c = normalizarCnpj(valor);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c)) return false;
  if (/^(\d)\1{13}$/.test(c)) return false; // 00.000.000/0000-00 e afins passariam na conta

  const valorDe = (ch: string) => ch.charCodeAt(0) - 48;
  for (const tamanho of [12, 13]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) {
      const peso = ((tamanho - 1 - i) % 8) + 2; // 2..9 da direita para a esquerda
      soma += valorDe(c[i]) * peso;
    }
    const resto = soma % 11;
    const dv = resto < 2 ? 0 : 11 - resto;
    if (dv !== Number(c[tamanho])) return false;
  }
  return true;
}

// Documento do proprietário, pessoa física ou jurídica: o tamanho diz qual é.
export function formatarDocumento(valor: string): string {
  return normalizarCnpj(valor).length === 14 ? formatarCnpj(valor) : formatarCpf(valor);
}

// Mesmo CPF ou mesmo CNPJ, independentemente da máscara. CPF com CNPJ nunca bate.
export function mesmoDocumento(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const na = normalizarCnpj(a);
  if (na.length === 14) return na === normalizarCnpj(b);
  const da = digitosCpf(a);
  return da.length === 11 && da === digitosCpf(b);
}

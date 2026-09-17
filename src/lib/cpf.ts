// CPF é gravado só em dígitos. A entrada aceita máscara porque é assim que as pessoas
// digitam, mas guardar os dois formatos quebra duas coisas: a comparação entre o CPF
// declarado pelo RT e o do proprietário do lote, e a própria restrição de CPF único, que
// deixaria passar a mesma pessoa uma vez com pontos e outra sem.
export function digitosCpf(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function formatarCpf(valor: string): string {
  const d = digitosCpf(valor);
  if (d.length !== 11) return valor; // usuários internos usam um marcador no lugar do CPF
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// Dígitos verificadores. Não prova que o CPF existe nem de quem é, mas derruba erro de
// digitação, que é o caso comum de um número trocado passar adiante.
export function cpfValido(valor: string): boolean {
  const d = digitosCpf(valor);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false; // 000.000.000-00 e afins passariam na conta

  for (const [ate, posicao] of [
    [9, 9],
    [10, 10],
  ] as const) {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i);
    const resto = (soma * 10) % 11 % 10;
    if (resto !== Number(d[posicao])) return false;
  }
  return true;
}

// Mesma pessoa, independentemente de como cada lado digitou.
export function mesmoCpf(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const da = digitosCpf(a);
  return da.length === 11 && da === digitosCpf(b);
}

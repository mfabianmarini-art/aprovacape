// Cabeçalho HTTP só carrega bytes até 0xFF: um nome com "–" (travessão, comum em arquivos
// gerados pelo Word) ou emoji fazia a rota lançar ao montar a resposta e devolver 500. O
// nome real vai codificado em filename* (RFC 6266/5987); filename leva uma versão só-ASCII
// para clientes que não leem filename*.
export function contentDisposition(tipo: "inline" | "attachment", nome: string) {
  const ascii = nome
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  const utf8 = encodeURIComponent(nome).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${tipo}; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

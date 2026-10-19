// Sem dependências de servidor: usado também em componentes do navegador.

// Título e critérios de um item: a primeira linha do texto é o título; as demais, os
// critérios (subitens a, b, c… do regulamento).
export function partesDoItem(texto: string) {
  const [titulo, ...criterios] = texto.split("\n").map((l) => l.trim());
  return { titulo, criterios: criterios.filter(Boolean) };
}

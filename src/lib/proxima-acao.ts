// O que o RT precisa fazer agora, em poucas palavras — destaque no card de Requerimentos,
// visível mesmo com o card fechado. Nulo quando a vez é da CAPE.
export function proximaAcaoDoRT(status: string) {
  if (status === "COMPLEMENTO") return "Corrigir os arquivos apontados e reenviar";
  if (status === "APROVADA" || status === "RESSALVAS") return "Enviar o alvará e a ART/RRT de execução";
  return null;
}

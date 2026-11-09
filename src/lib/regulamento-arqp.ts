// Declaração exigida pela ARQP, a associação do Quinta da Primavera: em outro loteamento
// ela não faria sentido. Mesmo critério de nome da migração do check-list do condomínio.
export function exigeRegulamentoArqp(nomeEmpreendimento: string) {
  return nomeEmpreendimento.trim().toLowerCase() === "quinta da primavera";
}

export const REGULAMENTO_ARQP_TEXTO = "Declaro ciência e concordância com o Regulamento de Obras - ARQP (Atendimento ao item 1.53 do Regulamento Interno)";

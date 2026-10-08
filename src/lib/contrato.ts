// Prazo contratual de guarda da documentação após a rescisão com o condomínio.
export const DIAS_DE_GUARDA_APOS_RESCISAO = 30;

export function fimDaGuarda(rescindidoEm: Date) {
  return new Date(rescindidoEm.getTime() + DIAS_DE_GUARDA_APOS_RESCISAO * 24 * 60 * 60 * 1000);
}

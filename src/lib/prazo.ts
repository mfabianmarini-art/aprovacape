export function diasDesde(d: Date) {
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

export function prazoTexto(s: { status: string; prazoDias: number; createdAt: Date; updatedAt: Date }) {
  switch (s.status) {
    case "ENVIADA":
      return `${s.prazoDias} dias`;
    case "ANALISE": {
      const restantes = Math.max(0, s.prazoDias - diasDesde(s.createdAt));
      return `${restantes} dias restantes`;
    }
    case "COMPLEMENTO":
      return "aguardando envio";
    default:
      return `atualizado ${diasDesde(s.updatedAt)}d atrás`;
  }
}

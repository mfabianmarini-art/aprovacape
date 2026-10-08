import { headers } from "next/headers";

// APP_URL fixa o endereço dos links dos e-mails; sem ela, vale o host desta requisição.
export async function urlDoApp() {
  const base = process.env.APP_URL;
  if (base) return base.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

// O RT entra pela plataforma (login leva a Meus requerimentos); o proprietário, sem conta,
// pela tela de acompanhamento com o protocolo já preenchido.
export const linkDoRT = (base: string) => `${base}/requerimentos`;
export const linkDoProprietario = (base: string, protocolo: string) =>
  `${base}/acompanhar?protocolo=${encodeURIComponent(protocolo)}`;

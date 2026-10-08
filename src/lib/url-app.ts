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

// Para links que dão acesso a uma conta (redefinição de senha) o endereço não pode vir da
// requisição: um Host forjado faria o e-mail levar o token para o domínio de quem pediu.
// Vale APP_URL, ou o domínio de produção que a própria Vercel informa; o host da
// requisição só em desenvolvimento.
export async function urlConfiavelDoApp() {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const base = process.env.APP_URL || (vercel ? `https://${vercel}` : "");
  if (base) return base.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return urlDoApp();
  throw new Error("APP_URL não configurada: sem ela não há como montar o link de redefinição de senha.");
}

// O RT entra pela plataforma (login leva a Meus requerimentos); o proprietário, sem conta,
// pela tela de acompanhamento com o protocolo já preenchido.
export const linkDoRT = (base: string) => `${base}/requerimentos`;
export const linkDoProprietario = (base: string, protocolo: string) =>
  `${base}/acompanhar?protocolo=${encodeURIComponent(protocolo)}`;

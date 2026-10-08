// Envio pela API HTTP do Resend, sem SDK. Sem RESEND_API_KEY o envio fica desligado e
// quem chama segue o fluxo sem e-mail — o app não pode travar por falta de configuração.
export type ResultadoEmail = { enviado: true } | { enviado: false; motivo: "nao-configurado" | "falha"; erro?: string };

export function emailConfigurado() {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_REMETENTE;
}

export async function enviarEmail(msg: { para: string[]; assunto: string; html: string; texto: string }): Promise<ResultadoEmail> {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;
  if (!chave || !remetente) return { enviado: false, motivo: "nao-configurado" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: remetente, to: msg.para, subject: msg.assunto, html: msg.html, text: msg.texto }),
    });
    if (!res.ok) {
      const erro = `${res.status} ${(await res.text()).slice(0, 300)}`;
      console.error("[email] Resend recusou o envio:", erro);
      return { enviado: false, motivo: "falha", erro };
    }
    return { enviado: true };
  } catch (e) {
    console.error("[email] falha de rede ao chamar o Resend:", e);
    return { enviado: false, motivo: "falha", erro: String(e) };
  }
}

export function escaparHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

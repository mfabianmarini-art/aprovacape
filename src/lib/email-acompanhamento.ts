import { escaparHtml } from "./email";

export type DadosAcesso = {
  protocolo: string;
  senha: string; // já formatada, XXXX-XXXX
  url: string; // endereço completo de /acompanhar
  lote: string; // "Quinta da Primavera · Q3 L12"
  nomeRT: string;
  destinatario: "proprietario" | "rt";
};

// Mesmo conteúdo para os dois, com a abertura trocada: o proprietário recebe o convite
// para acompanhar; o RT, a cópia do que foi mandado ao cliente dele.
export function emailAcesso(d: DadosAcesso) {
  const abertura =
    d.destinatario === "proprietario"
      ? `O responsável técnico ${d.nomeRT} protocolou na CAPE a solicitação de obra do seu lote. Você pode acompanhar a análise pela internet, sem precisar criar conta.`
      : `Cópia do acesso enviado ao proprietário da solicitação que você protocolou. Ele acompanha o andamento com estes dados; você continua conduzindo a solicitação pela plataforma.`;
  const assunto = `CAPE Aprova — acompanhe a solicitação ${d.protocolo}`;
  const link = `${d.url}?protocolo=${encodeURIComponent(d.protocolo)}`;

  const texto = [
    abertura,
    "",
    `Lote: ${d.lote}`,
    `Protocolo: ${d.protocolo}`,
    `Senha de acompanhamento: ${d.senha}`,
    "",
    `Acompanhe em: ${link}`,
    "",
    "Se receber uma nova senha depois desta, só a mais recente vale.",
    "Este é um e-mail automático; dúvidas sobre o projeto, fale com o responsável técnico.",
  ].join("\n");

  const e = escaparHtml;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f2ed;font-family:Arial,Helvetica,sans-serif;color:#231F20">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ed;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #DDD8CE;border-top:4px solid #E01B22">
<tr><td style="padding:24px 26px 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7A7472">CAPE Aprova · Obras em lotes</td></tr>
<tr><td style="padding:4px 26px 0;font-size:20px;font-weight:bold">Solicitação ${e(d.protocolo)}</td></tr>
<tr><td style="padding:12px 26px 0;font-size:14px;line-height:1.55;color:#3B4653">${e(abertura)}</td></tr>
<tr><td style="padding:18px 26px 0">
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#F6FAF7;border:1px solid #C6DAC9">
<tr><td style="padding:12px 16px 4px;font-size:12px;color:#7A7472">Lote</td><td style="padding:12px 16px 4px;font-size:14px">${e(d.lote)}</td></tr>
<tr><td style="padding:4px 16px;font-size:12px;color:#7A7472">Protocolo</td><td style="padding:4px 16px;font-size:16px;font-family:Consolas,monospace;font-weight:bold">${e(d.protocolo)}</td></tr>
<tr><td style="padding:4px 16px 12px;font-size:12px;color:#7A7472">Senha</td><td style="padding:4px 16px 12px;font-size:16px;font-family:Consolas,monospace;font-weight:bold;letter-spacing:1px">${e(d.senha)}</td></tr>
</table></td></tr>
<tr><td style="padding:20px 26px 0"><a href="${e(link)}" style="display:inline-block;background:#E01B22;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 20px">Acompanhar a solicitação</a></td></tr>
<tr><td style="padding:20px 26px 24px;font-size:12px;line-height:1.5;color:#7A7472">Se receber uma nova senha depois desta, só a mais recente vale. Este é um e-mail automático; dúvidas sobre o projeto, fale com o responsável técnico.</td></tr>
</table></td></tr></table></body></html>`;

  return { assunto, texto, html };
}

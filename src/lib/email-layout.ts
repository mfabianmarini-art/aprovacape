import { escaparHtml as e } from "./email";

// Molde comum dos e-mails: o que aconteceu, o que fazer agora (em destaque), detalhes e o
// botão de acesso ao sistema — que todo e-mail leva. HTML de tabela e estilo inline, que
// é o que os clientes de e-mail entendem; a versão em texto vai junto.
export type ConteudoEmail = {
  assunto: string;
  protocolo: string;
  titulo: string; // "Projeto aprovado"
  cor: string; // faixa do título — mesma paleta das etapas
  paragrafos: string[];
  acao: string; // "O que fazer agora"
  dados?: [string, string][]; // pares rótulo/valor (lote, protocolo, senha…)
  detalhesTitulo?: string;
  detalhes?: string[];
  link: { url: string; rotulo: string };
  rodape?: string;
};

const RODAPE_PADRAO = "Este é um e-mail automático da CAPE Aprova. Não é preciso responder.";

export function montarEmail(c: ConteudoEmail) {
  const texto = [
    `Solicitação ${c.protocolo} — ${c.titulo}`,
    "",
    ...c.paragrafos.flatMap((p) => [p, ""]),
    ...(c.dados ?? []).map(([r, v]) => `${r}: ${v}`),
    ...(c.dados?.length ? [""] : []),
    "O QUE FAZER AGORA",
    c.acao,
    "",
    ...(c.detalhes?.length ? [c.detalhesTitulo ?? "Detalhes", ...c.detalhes.map((d) => `- ${d}`), ""] : []),
    `${c.link.rotulo}: ${c.link.url}`,
    "",
    c.rodape ?? RODAPE_PADRAO,
  ].join("\n");

  const dados = c.dados?.length
    ? `<tr><td style="padding:16px 26px 0"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#FAF9F6;border:1px solid #EDE9E1">
${c.dados.map(([r, v]) => `<tr><td style="padding:8px 16px;font-size:12px;color:#7A7472;width:120px">${e(r)}</td><td style="padding:8px 16px;font-size:14px;font-family:Consolas,monospace;font-weight:bold">${e(v)}</td></tr>`).join("\n")}
</table></td></tr>`
    : "";

  const detalhes = c.detalhes?.length
    ? `<tr><td style="padding:18px 26px 0;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7A7472">${e(c.detalhesTitulo ?? "Detalhes")}</td></tr>
<tr><td style="padding:6px 26px 0"><ul style="margin:0;padding-left:18px;font-size:13.5px;line-height:1.55;color:#3B4653">
${c.detalhes.map((d) => `<li style="margin:0 0 6px;white-space:pre-line">${e(d)}</li>`).join("\n")}
</ul></td></tr>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;background:#f4f2ed;font-family:Arial,Helvetica,sans-serif;color:#231F20">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ed;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #DDD8CE;border-top:4px solid #E01B22">
<tr><td style="padding:24px 26px 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7A7472">CAPE Aprova · Solicitação ${e(c.protocolo)}</td></tr>
<tr><td style="padding:4px 26px 0"><span style="display:inline-block;border-left:4px solid ${e(c.cor)};padding-left:10px;font-size:20px;font-weight:bold">${e(c.titulo)}</span></td></tr>
${c.paragrafos.map((p) => `<tr><td style="padding:12px 26px 0;font-size:14px;line-height:1.55;color:#3B4653">${e(p)}</td></tr>`).join("\n")}
${dados}
<tr><td style="padding:18px 26px 0"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#FFF8E1;border:1px solid #F2C230">
<tr><td style="padding:12px 16px 2px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7A5B00;font-weight:bold">O que fazer agora</td></tr>
<tr><td style="padding:2px 16px 12px;font-size:14px;line-height:1.55;color:#231F20">${e(c.acao)}</td></tr>
</table></td></tr>
${detalhes}
<tr><td style="padding:22px 26px 0"><a href="${e(c.link.url)}" style="display:inline-block;background:#E01B22;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 20px">${e(c.link.rotulo)}</a></td></tr>
<tr><td style="padding:8px 26px 0;font-size:11.5px;color:#7A7472;word-break:break-all">${e(c.link.url)}</td></tr>
<tr><td style="padding:20px 26px 24px;font-size:12px;line-height:1.5;color:#7A7472">${e(c.rodape ?? RODAPE_PADRAO)}</td></tr>
</table></td></tr></table></body></html>`;

  return { assunto: c.assunto, texto, html };
}

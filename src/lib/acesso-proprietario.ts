import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { cifrarSenha, formatarSenha, gerarSenhaAcompanhamento } from "@/lib/acompanhamento";
import { enviarEmail, type ResultadoEmail } from "@/lib/email";
import { emailAcesso } from "@/lib/email-acompanhamento";

// APP_URL fixa o endereço dos links dos e-mails; sem ela, vale o host desta requisição.
async function urlAcompanhar() {
  const base = process.env.APP_URL;
  if (base) return `${base.replace(/\/$/, "")}/acompanhar`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}/acompanhar`;
}

// Gera senha nova, grava e manda protocolo + senha ao proprietário, com cópia ao RT. A
// senha é gravada antes do envio: um e-mail que sai com senha não gravada seria pior do
// que um que não sai. Falha de e-mail não desfaz nada — o RT vê a senha no card e repassa.
export async function emitirAcessoProprietario(solicitacaoId: string, proprietarioEmail: string): Promise<{ proprietario: ResultadoEmail }> {
  const sol = await prisma.solicitacao.findUniqueOrThrow({
    where: { id: solicitacaoId },
    select: {
      protocolo: true,
      updatedAt: true,
      responsavelTecnicoNome: true,
      responsavelTecnicoEmail: true,
      lote: { select: { numero: true, quadra: { select: { nome: true } }, empreendimento: { select: { nome: true } } } },
    },
  });
  const senha = gerarSenhaAcompanhamento();
  // updatedAt repassado: trocar a senha não é movimentação da solicitação, e o resumo
  // mede o tempo parado em complementação por ele.
  await prisma.solicitacao.update({
    where: { id: solicitacaoId },
    data: {
      acompanhamentoSenhaCifrada: cifrarSenha(senha),
      acompanhamentoTentativas: 0,
      acompanhamentoBloqueadoAte: null,
      proprietarioEmail,
      acompanhamentoEnviadoEm: null,
      updatedAt: sol.updatedAt,
    },
  });

  const base = {
    protocolo: sol.protocolo,
    senha: formatarSenha(senha),
    url: await urlAcompanhar(),
    lote: `${sol.lote.empreendimento.nome} · ${sol.lote.quadra.nome} L${sol.lote.numero}`,
    nomeRT: sol.responsavelTecnicoNome,
  };
  const paraProprietario = emailAcesso({ ...base, destinatario: "proprietario" });
  const proprietario = await enviarEmail({ para: [proprietarioEmail], ...paraProprietario });
  if (proprietario.enviado && sol.responsavelTecnicoEmail) {
    await enviarEmail({ para: [sol.responsavelTecnicoEmail], ...emailAcesso({ ...base, destinatario: "rt" }) });
  }
  if (proprietario.enviado) {
    await prisma.solicitacao.update({
      where: { id: solicitacaoId },
      data: { acompanhamentoEnviadoEm: new Date(), updatedAt: sol.updatedAt },
    });
  }
  return { proprietario };
}

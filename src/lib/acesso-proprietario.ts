import { prisma } from "@/lib/prisma";
import { cifrarSenha, formatarSenha, gerarSenhaAcompanhamento } from "@/lib/acompanhamento";
import { enviarEmail, type ResultadoEmail } from "@/lib/email";
import { emailAcesso } from "@/lib/email-acompanhamento";
import { urlDoApp } from "@/lib/url-app";
import { emailsDoRT } from "@/lib/notificacoes";

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
      lote: { select: { numero: true, rt: { select: { email: true } }, quadra: { select: { nome: true } }, empreendimento: { select: { nome: true } } } },
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
    base: await urlDoApp(),
    lote: `${sol.lote.empreendimento.nome} · ${sol.lote.quadra.nome} L${sol.lote.numero}`,
    nomeRT: sol.responsavelTecnicoNome,
  };
  const paraProprietario = emailAcesso({ ...base, destinatario: "proprietario" });
  const proprietario = await enviarEmail({ para: [proprietarioEmail], ...paraProprietario });
  const rt = emailsDoRT(sol);
  if (proprietario.enviado && rt.length > 0) {
    await enviarEmail({ para: rt, ...emailAcesso({ ...base, destinatario: "rt" }) });
  }
  if (proprietario.enviado) {
    await prisma.solicitacao.update({
      where: { id: solicitacaoId },
      data: { acompanhamentoEnviadoEm: new Date(), updatedAt: sol.updatedAt },
    });
  }
  return { proprietario };
}

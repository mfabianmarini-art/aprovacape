import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarEmail } from "@/lib/email";
import { montarEmail } from "@/lib/email-layout";
import { urlDoApp } from "@/lib/url-app";

export type EventoVinculo = { tipo: "SOLICITADO" } | { tipo: "APROVADO" } | { tipo: "RECUSADO"; motivo: string | null };

// Avisa quem pediu o vínculo a cada passo: pedido recebido, aprovado ou reprovado. Roda
// depois da resposta; falha de e-mail só vai para o log e não desfaz a decisão.
export async function notificarVinculo(userId: string, evento: EventoVinculo) {
  const base = await urlDoApp();
  after(async () => {
    try {
      await enviar(userId, evento, base);
    } catch (e) {
      console.error(`[email] falha ao avisar vínculo ${evento.tipo} do usuário ${userId}:`, e);
    }
  });
}

async function enviar(userId: string, evento: EventoVinculo, base: string) {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      role: true,
      vinculoLote: { select: { numero: true, quadra: { select: { nome: true } }, empreendimento: { select: { nome: true } } } },
    },
  });
  const lote = u.vinculoLote ? `${u.vinculoLote.empreendimento.nome} · ${u.vinculoLote.quadra.nome} L${u.vinculoLote.numero}` : "—";
  const papel = u.role === "RESPONSAVEL_TECNICO" ? "responsável técnico" : "proprietário";
  const comum = { cabecalho: "Vínculo com lote", dados: [["Lote", lote]] as [string, string][] };

  const conteudo =
    evento.tipo === "SOLICITADO"
      ? montarEmail({
          ...comum,
          assunto: `CAPE Aprova — pedido de vínculo recebido (${lote})`,
          titulo: "Pedido de vínculo recebido",
          cor: "#B4711A",
          paragrafos: [`Olá, ${u.name}. Recebemos o seu pedido de vínculo como ${papel} do lote abaixo. A CAPE vai conferir a documentação enviada.`],
          acao: "Nenhuma ação é necessária agora. Você receberá um e-mail quando o pedido for aprovado ou reprovado.",
          link: { url: `${base}/vinculo`, rotulo: "Ver o pedido" },
        })
      : evento.tipo === "APROVADO"
        ? montarEmail({
            ...comum,
            assunto: `CAPE Aprova — vínculo aprovado (${lote})`,
            titulo: "Vínculo aprovado",
            cor: "#24603A",
            paragrafos: [`Olá, ${u.name}. A CAPE aprovou o seu vínculo como ${papel} do lote abaixo.`],
            acao:
              u.role === "RESPONSAVEL_TECNICO"
                ? "O lote já aparece em Nova solicitação: você pode abrir a solicitação de obra quando a documentação estiver pronta."
                : "O lote já aparece na sua conta.",
            link: u.role === "RESPONSAVEL_TECNICO" ? { url: `${base}/nova`, rotulo: "Abrir nova solicitação" } : { url: `${base}/requerimentos`, rotulo: "Acessar o sistema" },
          })
        : montarEmail({
            ...comum,
            assunto: `CAPE Aprova — vínculo reprovado (${lote})`,
            titulo: "Vínculo reprovado",
            cor: "#8C2B22",
            paragrafos: [`Olá, ${u.name}. A CAPE não aprovou o seu pedido de vínculo como ${papel} do lote abaixo.`],
            ...(evento.motivo ? { detalhesTitulo: "Motivo informado pela CAPE", detalhes: [evento.motivo] } : {}),
            acao: "Corrija o que foi apontado e faça um novo pedido de vínculo pela plataforma. Em caso de dúvida, fale com a CAPE.",
            link: { url: `${base}/vinculo`, rotulo: "Fazer novo pedido" },
          });

  const r = await enviarEmail({ para: [u.email], ...conteudo });
  if (!r.enviado && r.motivo === "falha") console.error(`[email] vínculo ${evento.tipo} para ${u.email} não enviado: ${r.erro}`);
}

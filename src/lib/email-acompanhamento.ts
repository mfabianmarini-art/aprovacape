import { montarEmail } from "./email-layout";
import { linkDoProprietario, linkDoRT } from "./url-app";

export type DadosAcesso = {
  protocolo: string;
  senha: string; // já formatada, XXXX-XXXX
  base: string; // endereço do app, sem barra no fim
  lote: string; // "Quinta da Primavera · Q3 L12"
  nomeRT: string;
  destinatario: "proprietario" | "rt";
};

// Mesmos dados para os dois, com a abertura e o link trocados: o proprietário recebe o
// convite para acompanhar; o RT, a cópia do que foi mandado ao cliente dele e o acesso à
// plataforma, por onde conduz a solicitação.
export function emailAcesso(d: DadosAcesso) {
  const proprietario = d.destinatario === "proprietario";
  return montarEmail({
    assunto: `CAPE Aprova — solicitação ${d.protocolo} protocolada`,
    cabecalho: `Solicitação ${d.protocolo}`,
    titulo: "Solicitação protocolada",
    cor: "#24603A",
    paragrafos: [
      proprietario
        ? `O responsável técnico ${d.nomeRT} protocolou na CAPE a solicitação de obra do seu lote. Você pode acompanhar a análise pela internet, sem precisar criar conta, com o protocolo e a senha abaixo.`
        : `A solicitação foi protocolada na CAPE. Abaixo, a cópia do acesso enviado ao proprietário: ele acompanha o andamento com estes dados; você continua conduzindo a solicitação pela plataforma.`,
      "Próxima etapa: a CAPE confere a documentação enviada. O prazo de análise do projeto, de até 15 dias úteis, começa a contar depois da validação documental. Cada mudança de etapa é avisada por e-mail.",
    ],
    dados: [
      ["Lote", d.lote],
      ["Protocolo", d.protocolo],
      ["Senha", d.senha],
    ],
    acao: proprietario
      ? "Nenhuma ação é necessária agora. Guarde o protocolo e a senha para acompanhar a solicitação."
      : "Nenhuma ação é necessária agora. Aguarde a conferência da documentação pela CAPE.",
    link: proprietario
      ? { url: linkDoProprietario(d.base, d.protocolo), rotulo: "Acompanhar a solicitação" }
      : { url: linkDoRT(d.base), rotulo: "Acessar o sistema" },
    rodape: proprietario
      ? "Se receber uma nova senha depois desta, só a mais recente vale. Este é um e-mail automático; dúvidas sobre o projeto, fale com o responsável técnico."
      : "Se o proprietário receber uma nova senha depois desta, só a mais recente vale. Este é um e-mail automático da CAPE Aprova.",
  });
}

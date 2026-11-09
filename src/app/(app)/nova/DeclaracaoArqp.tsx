"use client";

import { useRef } from "react";
import { formatarCpf } from "@/lib/cpf";

export type DadosDeclaracaoArqp = {
  empreendimento: string;
  quadra: string;
  lotes: string[];
  proprietario: string | null;
  rtNome: string;
  rtCpf: string;
  rtRegistro: string;
};

const paragrafo: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, color: "#3B4653", margin: 0 };
const secao: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", color: "#231F20", margin: "8px 0 0" };
const lista: React.CSSProperties = { ...paragrafo, paddingLeft: 20, listStyle: "disc", display: "flex", flexDirection: "column", gap: 3 };
const fechar: React.CSSProperties = { border: "1px solid #DDD8CE", background: "#fff", color: "#E01B22", borderRadius: 4, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" };

function Dados({ linhas }: { linhas: [string, string][] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, background: "#FAF9F6", border: "1px solid #EDE9E1", borderRadius: 4, padding: "10px 12px" }}>
      {linhas.map(([k, v]) => (
        <div key={k} style={{ fontSize: 13, lineHeight: 1.45, color: "#3B4653" }}>
          <strong>{k}:</strong> {v}
        </div>
      ))}
    </div>
  );
}

// Texto da declaração em papel da ARQP, adaptado ao envio pela plataforma: os dados vêm da
// solicitação e do cadastro do RT, e o aceite substitui as assinaturas. O RT assina também
// pelo proprietário, de quem tem procuração.
export function DeclaracaoArqp({ dados }: { dados: DadosDeclaracaoArqp }) {
  const janela = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => janela.current?.showModal()}
        style={{ border: 0, background: "none", padding: 0, marginLeft: 6, color: "#E01B22", fontSize: 12.5, fontWeight: 600, textDecoration: "underline", cursor: "pointer" }}
      >
        Ler a declaração completa
      </button>

      <dialog
        ref={janela}
        aria-labelledby="declaracao-arqp-titulo"
        className="modal-documento"
        onClick={(e) => {
          // O conteúdo ocupa a janela inteira: clique com o alvo no próprio dialog é no fundo.
          if (e.target === janela.current) janela.current?.close();
        }}
        style={{ width: "min(720px, calc(100vw - 32px))", maxWidth: "none", maxHeight: "85vh", margin: "auto", padding: 0, border: 0, borderRadius: 6, overflow: "hidden" }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxHeight: "85vh" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "16px 20px", borderBottom: "1px solid #EDE9E1" }}>
            <div id="declaracao-arqp-titulo" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, lineHeight: 1.15 }}>Declaração de ciência e concordância</span>
              <span style={{ fontSize: 12.5, color: "#4A5563" }}>Regulamento de Obras – ARQP (Atendimento ao item 1.53 do Regulamento Interno)</span>
            </div>
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => janela.current?.close()}
              style={{ border: 0, background: "none", color: "#7A7472", fontSize: 22, lineHeight: 1, padding: "0 4px", cursor: "pointer" }}
            >
              ×
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <Dados
              linhas={[
                ["Empreendimento", dados.empreendimento],
                [dados.lotes.length > 1 ? "Lotes" : "Lote", dados.lotes.join(", ")],
                ["Quadra", dados.quadra],
                ...(dados.proprietario ? [["Proprietário", dados.proprietario] as [string, string]] : []),
                ["Projeto protocolado em", "data do envio desta solicitação"],
              ]}
            />

            <h3 style={secao}>1. IDENTIFICAÇÃO DO RESPONSÁVEL TÉCNICO</h3>
            <Dados
              linhas={[
                ["Nome", dados.rtNome],
                ["CPF", formatarCpf(dados.rtCpf)],
                ["Qualificação", "Responsável técnico"],
                ...(dados.rtRegistro ? [["Registro profissional (CAU/CREA)", dados.rtRegistro] as [string, string]] : []),
              ]}
            />

            <h3 style={secao}>2. DECLARAÇÃO DE CIÊNCIA</h3>
            <p style={paragrafo}>
              2.1. Declaro, para os devidos fins e em atendimento ao item 1.53 do Regulamento de Obras da ASSOCIAÇÃO RESIDENCIAL QUINTA DA PRIMAVERA – ARQP, que:
            </p>
            <p style={paragrafo}>
              I – Recebi e tenho pleno conhecimento do Regulamento de Obras, do Regulamento Interno e do Regulamento de Restrições Urbanísticas aplicáveis ao Loteamento Quinta da Primavera;
            </p>
            <p style={paragrafo}>II – Estou ciente das normas relativas a:</p>
            <ul style={lista}>
              <li>Procedimentos para aprovação de projetos;</li>
              <li>Horários permitidos para execução de obras;</li>
              <li>Controle de acesso de funcionários e prestadores;</li>
              <li>Circulação e estacionamento de veículos;</li>
              <li>Utilização de tapumes e organização do canteiro;</li>
              <li>Descarte de resíduos e entulho;</li>
              <li>Preservação ambiental e proteção das áreas comuns;</li>
              <li>Aplicação de penalidades por descumprimento;</li>
            </ul>
            <p style={paragrafo}>III – Comprometo-me a cumprir integralmente as normas estabelecidas pela ARQP durante toda a execução do projeto e/ou obra;</p>
            <p style={paragrafo}>
              IV – Reconheço que o descumprimento das normas poderá ensejar aplicação de penalidades previstas no Regulamento, inclusive advertências, multas e suspensão de atividades.
            </p>

            <h3 style={secao}>3. RESPONSABILIDADE TÉCNICA</h3>
            <p style={paragrafo}>3.1. Quando se tratar de arquiteto, paisagista ou construtor, declaro que:</p>
            <ul style={lista}>
              <li>O projeto e/ou execução da obra será realizada sob minha responsabilidade técnica;</li>
              <li>A respectiva ART/RRT será devidamente registrada junto ao órgão competente;</li>
              <li>Responderei por eventuais irregularidades decorrentes da execução sob minha responsabilidade.</li>
            </ul>

            <h3 style={secao}>4. DAS CONDIÇÕES DO CONTRATO</h3>
            <p style={paragrafo}>4.1. O COMPRADOR apenas poderá executar benfeitorias, acessões e melhoramentos no Imóvel, desde que:</p>
            <p style={paragrafo}>
              a) sejam respeitadas as normas e legislações vigentes, inclusive as regras do Regulamento Interno do Loteamento (ANEXO II) e Regulamento de Restrições Urbanísticas (ANEXO III);
            </p>
            <p style={paragrafo}>b) não seja de qualquer forma prejudicada a infraestrutura do Loteamento;</p>
            <p style={paragrafo}>c) não faça aterros, desaterros, desvios ou encaminhamentos de águas pluviais, nem qualquer movimento de terras que prejudique os terrenos vizinhos;</p>
            <p style={paragrafo}>
              d) se necessário for, permita a passagem das tubulações de água e esgoto pelo Imóvel objetivado pelo presente Contrato, e/ou o escoamento das águas pluviais dos imóveis vizinhos, quando a conformação do(s) terreno(s) assim exigir;
            </p>
            <p style={paragrafo}>e) mantenha o Imóvel em perfeito estado de limpeza e higiene, inclusive a metade da via pública para a qual tenha testada;</p>
            <p style={paragrafo}>
              f) respeite as divisas do Imóvel, já que o terreno lhe será entregue perfeitamente demarcado com marcos de concreto, mantendo tais divisas vivas, não construindo sobre terrenos confinantes, ou mesmo demolindo, às suas custas exclusivas, muros, paredes, cercas e demais construções que haja executado fora do Imóvel;
            </p>
            <p style={paragrafo}>g) não lance nem permita que seja lançado lixo, detritos ou entulhos do Imóvel nos demais lotes, vias de circulação ou áreas e espaços livres;</p>
            <p style={paragrafo}>
              h) inicie a construção de casas, somente após a autorização da Municipalidade e da ARQP, quando as obras de rede de água, rede de esgotos, rede de energia elétrica, e pavimento asfáltico integrado às calçadas gramadas estiverem totalmente construídas e com a expedição do TVO – Termo de Verificação de Obras.
            </p>
            <p style={paragrafo}>
              4.2. O DECLARANTE reconhece, ainda, que o projeto ora protocolado possui caráter meramente prévio e indicativo, não se enquadrando como benfeitoria, acessão ou melhoramento para quaisquer fins legais ou contratuais, nos termos da Cláusula 6.9.1 do Contrato de Compromisso de Compra e Venda, razão pela qual não ensejará qualquer direito à indenização, ressarcimento ou retenção, a qualquer título.
            </p>
            <p style={paragrafo}>4.3. O DECLARANTE declara ciência expressa de que:</p>
            <p style={paragrafo}>I – Nos termos da alínea “h” da cláusula 4.1 acima, a execução de qualquer obra somente poderá ser iniciada após:</p>
            <p style={paragrafo}>(i) a conclusão integral das obras de infraestrutura do loteamento;</p>
            <p style={paragrafo}>(ii) a expedição do TVO – Termo de Verificação de Obras pela Municipalidade;</p>
            <p style={paragrafo}>(iii) a obtenção das aprovações necessárias junto à ARQP e demais órgãos competentes;</p>
            <p style={paragrafo}>II – Adicionalmente, nos termos da Cláusula 7.1 do Contrato, a execução de qualquer construção no lote está condicionada à quitação integral do preço e outorga da escritura definitiva;</p>
            <p style={paragrafo}>III – O eventual protocolo, análise ou aprovação prévia de projeto não autoriza o início de obras, nem gera direito adquirido, expectativa de direito ou qualquer obrigação da loteadora;</p>
            <p style={paragrafo}>
              IV – Qualquer ato em desconformidade com as condições acima será considerado irregular, sujeitando o infrator às penalidades previstas nos regulamentos aplicáveis e no contrato, sem prejuízo das medidas judiciais cabíveis.
            </p>

            <h3 style={secao}>ACEITE ELETRÔNICO</h3>
            <p style={paragrafo}>
              Esta declaração é firmada eletronicamente pelo responsável técnico identificado acima, ao marcar o aceite e enviar a solicitação, dispensada a assinatura. O aceite vale também em nome do proprietário, representado pelo responsável técnico por meio de procuração.
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 20px", borderTop: "1px solid #EDE9E1" }}>
            <button type="button" onClick={() => janela.current?.close()} style={fechar}>
              Fechar
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

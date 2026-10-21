import { requireRole } from "@/lib/require-role";
import { getUserDisplay } from "@/lib/user-display";
import { prisma } from "@/lib/prisma";
import { labelDaTela } from "@/lib/nav";
import { DOC_LABEL, DOC_OPCIONAIS, DOC_ORDER, formatosAceitos } from "@/lib/status";
import { embedDoVideo } from "@/lib/video-tutorial";
import { tutorialAtual } from "@/lib/tutorial";
import { TutorialGestao } from "./TutorialGestao";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenBody } from "@/components/ScreenBody";

export const metadata = { title: "Como usar a plataforma · CAPE Aprova" };

const cartao: React.CSSProperties = { background: "#fff", border: "1px solid #DDD8CE", borderRadius: 4, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 };
const rotulo: React.CSSProperties = { fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "#7A7472" };
const texto: React.CSSProperties = { fontSize: 13.5, color: "#3B4653", lineHeight: 1.6, margin: 0 };
// O CSS global zera os marcadores de lista; aqui eles fazem parte da leitura.
const lista: React.CSSProperties = { ...texto, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 4 };
const ol: React.CSSProperties = { ...lista, listStyle: "decimal" };
const ul: React.CSSProperties = { ...lista, listStyle: "disc" };

// Passo a passo do RT, na ordem em que as coisas acontecem. O texto acompanha as regras do
// sistema — ao mudar uma regra (prazo, documentos, etapas), revise aqui também.
const PASSOS: { id: string; titulo: string; onde?: { href: string; rotulo: string }; corpo: React.ReactNode }[] = [
  {
    id: "vinculo",
    titulo: "Vincule-se ao lote",
    onde: { href: "/vinculo", rotulo: "Pedir vínculo" },
    corpo: (
      <>
        <p style={texto}>
          Antes de abrir uma solicitação, o lote precisa estar vinculado à sua conta. Peça o vínculo informando o empreendimento,
          a quadra e o lote, os dados do proprietário, a <strong>procuração assinada por ele</strong> e os documentos de identidade (RG ou CNH) dele e seu.
        </p>
        <p style={texto}>A CAPE confere o pedido e você recebe um e-mail com a resposta. Aprovado, o lote passa a aparecer em Nova solicitação.</p>
      </>
    ),
  },
  {
    id: "normas",
    titulo: "Consulte as normas do empreendimento",
    onde: { href: "/documentos", rotulo: "Normas para aprovação" },
    corpo: (
      <p style={texto}>
        Em <strong>Normas para aprovação</strong> ficam o regulamento interno, o manual do proprietário e os demais documentos
        técnicos do condomínio. É com base neles que a CAPE analisa o projeto — recuos, taxas, altura, muros, arrimos — então
        elabore o projeto com eles em mãos.
      </p>
    ),
  },
  {
    id: "solicitacao",
    titulo: "Abra a solicitação de obra",
    onde: { href: "/nova", rotulo: "Nova solicitação" },
    corpo: (
      <>
        <p style={texto}>A solicitação tem três etapas. Você pode parar e continuar depois: o rascunho fica salvo em Nova solicitação.</p>
        <ol style={ol}>
          <li>
            <strong>Lote e obra</strong> — escolha o lote, o tipo de obra, a área e descreva a intervenção. Informe também o e-mail do
            proprietário.
          </li>
          <li>
            <strong>Documentos</strong> — anexe os arquivos obrigatórios (lista abaixo). Cada arquivo é conferido na hora: formato,
            tamanho e conteúdo.
          </li>
          <li>
            <strong>Responsável e declarações</strong> — seus dados de responsável pelo projeto já vêm preenchidos. Informe se você
            também responde pela execução da obra e aceite as declarações.
          </li>
        </ol>
        <p style={texto}>
          Ao enviar, a solicitação recebe um número de protocolo e o <strong>proprietário recebe por e-mail o protocolo e uma senha</strong>{" "}
          para acompanhar a aprovação, sem precisar de conta — você recebe uma cópia.
        </p>
      </>
    ),
  },
  {
    id: "analise",
    titulo: "Acompanhe a análise",
    onde: { href: "/requerimentos", rotulo: "Meus requerimentos" },
    corpo: (
      <>
        <ol style={ol}>
          <li>
            <strong>Validação documental</strong> — a CAPE confere se os documentos estão completos, legíveis e corretos.
          </li>
          <li>
            <strong>Análise técnica</strong> — o projeto é verificado item a item no check-list do regulamento do empreendimento. O
            prazo de análise, em <strong>dias úteis</strong>, começa a contar quando a documentação é validada.
          </li>
          <li>
            <strong>Parecer</strong> — o projeto é aprovado ou devolvido com as pendências a corrigir.
          </li>
        </ol>
        <p style={texto}>
          Cada mudança de etapa é avisada por e-mail a você e ao proprietário. Em Meus requerimentos, a barra de etapas mostra onde a
          solicitação está e, quando a ação é sua, o card aparece em destaque com o aviso <strong>“Sua vez”</strong>.
        </p>
      </>
    ),
  },
  {
    id: "devolucao",
    titulo: "Se a solicitação for devolvida",
    corpo: (
      <>
        <p style={texto}>O card mostra a <strong>Próxima ação</strong> em três passos:</p>
        <ol style={ol}>
          <li>Veja o que a CAPE apontou — os itens com a descrição da pendência e, se houver, o arquivo com os apontamentos.</li>
          <li>Substitua os arquivos corrigidos. É preciso trocar ao menos um arquivo para poder reenviar.</li>
          <li>Clique em <strong>Enviar complementação</strong>.</li>
        </ol>
        <p style={texto}>
          Na reanálise, só os itens reprovados são reabertos; os já aprovados permanecem. Devoluções da validação documental não
          contam como reenvio; as da análise técnica contam, e há um limite de reenvios sem nova taxa (veja abaixo as regras dos seus
          empreendimentos).
        </p>
      </>
    ),
  },
  {
    id: "alvara",
    titulo: "Projeto aprovado: envie o alvará e a ART/RRT de execução",
    corpo: (
      <>
        <p style={texto}>
          A aprovação da CAPE <strong>não substitui a aprovação da Prefeitura</strong>. Com o projeto aprovado, obtenha o alvará de
          execução e anexe, na própria solicitação, o <strong>alvará</strong> e a <strong>ART/RRT de execução atual e válida</strong>{" "}
          (ambos em PDF).
        </p>
        <p style={texto}>A CAPE confere os dois documentos. A obra só pode começar depois que forem aceitos — você recebe um e-mail.</p>
      </>
    ),
  },
  {
    id: "obra",
    titulo: "Durante e depois da obra",
    corpo: (
      <ul style={ul}>
        <li>A CAPE acompanha a execução. Se for constatada alguma irregularidade, você e o proprietário são avisados por e-mail, com o relatório e as fotos.</li>
        <li>Assim que for liberado o TVO (Termo de Vistoria de Obra), apresente a matrícula atualizada do imóvel à CAPE.</li>
        <li>Concluída a obra, a solicitação é encerrada e vai para “Ver protocolos encerrados”, em Meus requerimentos.</li>
      </ul>
    ),
  },
];

const PERGUNTAS: { p: string; r: React.ReactNode }[] = [
  {
    p: "Um arquivo foi recusado no envio. O que fazer?",
    r: "A mensagem diz o motivo: formato, tamanho ou conteúdo inválido (por exemplo, um arquivo que não é PDF de verdade). Corrija e anexe de novo. Para reduzir o tamanho, exporte o PDF do programa de projeto com a opção “PDF otimizado” e digitalize documentos em papel entre 150 e 300 dpi.",
  },
  {
    p: "Tenho mais de um arquivo DWG.",
    r: "Junte todos numa pasta compactada (.zip) e envie no campo do projeto em DWG. Qualquer versão do AutoCAD é aceita.",
  },
  {
    p: "O proprietário não recebeu o e-mail com o protocolo e a senha.",
    r: "Peça para ele verificar a caixa de spam. Os dados de acesso também aparecem para você em Meus requerimentos → Detalhes da solicitação, e a CAPE pode reenviar o e-mail.",
  },
  {
    p: "Esqueci minha senha.",
    r: (
      <>
        Use <a href="/esqueci-senha">Esqueci minha senha</a> na tela de entrada: você recebe por e-mail um link para criar uma senha
        nova.
      </>
    ),
  },
  {
    p: "Outro profissional vai assumir a obra.",
    r: "O novo responsável técnico pede o vínculo com o lote, com a procuração do proprietário. Quando a CAPE aprova, as ações da solicitação passam para ele; você continua vendo o que protocolou.",
  },
  {
    p: "Onde vejo arquivos que já substituí?",
    r: "No card da solicitação, em “Versões anteriores”. Elas ficam disponíveis até a liberação da obra; depois disso, só a documentação aprovada é guardada.",
  },
];

export default async function AjudaPage() {
  // A equipe CAPE também abre a página: vê o que o RT vê e publica o vídeo tutorial.
  const session = await requireRole("RESPONSAVEL_TECNICO", "ADMIN_CAPE", "CAPE_ANALISTA");
  const ehCape = session.user.role !== "RESPONSAVEL_TECNICO";
  const [user, empreendimentos, tutorial] = await Promise.all([
    getUserDisplay(session.user.id, session.user.role),
    // Regras dos empreendimentos onde o RT tem lote: prazo e reenvios variam de um para outro.
    // A equipe CAPE vê as de todos.
    prisma.empreendimento.findMany({
      where: ehCape ? {} : { lotes: { some: { rtId: session.user.id } } },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, prazoDias: true, reenviosSemTaxa: true, prazoComplementoDias: true },
    }),
    tutorialAtual(),
  ]);
  // O vídeo guardado na plataforma tem prioridade; o link externo (YouTube/Vimeo, variável
  // VIDEO_TUTORIAL_URL) fica como alternativa.
  const externo = tutorial.video ? null : embedDoVideo(process.env.VIDEO_TUTORIAL_URL);
  // Muda a cada troca: o navegador não reaproveita o vídeo ou a legenda anteriores.
  const versao = (a: { id: string } | null) => (a ? `?v=${a.id}` : "");

  return (
    <>
      <ScreenHeader crumb="Ajuda" title={labelDaTela("ajuda", session.user.role)} {...user} />
      <ScreenBody>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 920 }}>
          <section style={cartao} aria-labelledby="video-titulo">
            <div id="video-titulo" style={rotulo}>
              Vídeo tutorial
            </div>
            <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#231F20", borderRadius: 4, overflow: "hidden" }}>
              {tutorial.video ? (
                <video
                  controls
                  preload="metadata"
                  playsInline
                  src={`/api/tutorial/video${versao(tutorial.video)}`}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "#231F20" }}
                >
                  {tutorial.legenda && (
                    <track kind="captions" srcLang="pt-BR" label="Português" src={`/api/tutorial/legenda${versao(tutorial.legenda)}`} default />
                  )}
                  Seu navegador não reproduz este vídeo.
                </video>
              ) : externo ? (
                <iframe
                  src={externo}
                  title="Vídeo tutorial da plataforma CAPE Aprova"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#fff", textAlign: "center", padding: 20 }}>
                  <span aria-hidden style={{ width: 58, height: 58, borderRadius: "50%", border: "2px solid rgba(255,255,255,.6)", display: "grid", placeItems: "center", fontSize: 22 }}>
                    ▶
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Vídeo tutorial em breve</span>
                  <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.75)", maxWidth: "46ch", lineHeight: 1.5 }}>
                    Enquanto isso, o passo a passo abaixo explica cada etapa da plataforma.
                  </span>
                </div>
              )}
            </div>
            {ehCape && <TutorialGestao video={tutorial.video} legenda={tutorial.legenda} />}
          </section>

          <section style={cartao}>
            <div style={rotulo}>Visão geral</div>
            <p style={texto}>
              A plataforma CAPE Aprova concentra a aprovação de obras nos lotes do condomínio: você, responsável técnico, pede o vínculo
              com o lote, envia o projeto e os documentos, acompanha a análise da CAPE e responde às pendências — tudo por aqui, com aviso
              por e-mail a cada etapa. O proprietário acompanha pela internet com o protocolo e a senha que recebe.
            </p>
            <nav aria-label="Etapas" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PASSOS.map((p, i) => (
                <a key={p.id} href={`#${p.id}`} style={{ fontSize: 12.5, border: "1px solid #DDD8CE", borderRadius: 999, padding: "5px 11px", textDecoration: "none", color: "#231F20" }}>
                  {i + 1}. {p.titulo.split(":")[0]}
                </a>
              ))}
              <a href="#perguntas" style={{ fontSize: 12.5, border: "1px solid #DDD8CE", borderRadius: 999, padding: "5px 11px", textDecoration: "none", color: "#231F20" }}>
                Perguntas frequentes
              </a>
            </nav>
          </section>

          {PASSOS.map((p, i) => (
            <section key={p.id} id={p.id} style={{ ...cartao, scrollMarginTop: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr)", gap: 12, alignItems: "start" }}>
                <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#E01B22", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14 }}>{i + 1}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, margin: 0, lineHeight: 1.2 }}>{p.titulo}</h2>
                    {p.onde && (
                      <a href={p.onde.href} style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {p.onde.rotulo} →
                      </a>
                    )}
                  </div>
                  {p.corpo}
                  {p.id === "solicitacao" && <TabelaDocumentos />}
                  {p.id === "devolucao" && <RegrasDosEmpreendimentos empreendimentos={empreendimentos} />}
                </div>
              </div>
            </section>
          ))}

          <section id="perguntas" style={{ ...cartao, scrollMarginTop: 16 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, margin: 0 }}>Perguntas frequentes</h2>
            {PERGUNTAS.map((q) => (
              <details key={q.p} style={{ borderTop: "1px solid #EDE9E1", paddingTop: 10 }}>
                <summary style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "#231F20" }}>{q.p}</summary>
                <p style={{ ...texto, paddingTop: 8 }}>{q.r}</p>
              </details>
            ))}
            <p style={{ ...texto, fontSize: 12.5, color: "#7A7472", borderTop: "1px solid #EDE9E1", paddingTop: 10 }}>
              Não encontrou o que procurava? Fale com a equipe CAPE.
            </p>
          </section>
        </div>
      </ScreenBody>
    </>
  );
}

function TabelaDocumentos() {
  const linha = (t: (typeof DOC_ORDER)[number], obrigatorio: boolean) => (
    <tr key={t} style={{ borderTop: "1px solid #EDE9E1" }}>
      <td style={{ padding: "7px 10px 7px 0", fontSize: 13 }}>{DOC_LABEL[t].nome}</td>
      <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "var(--font-mono)", color: "#4A5563", whiteSpace: "nowrap" }}>{formatosAceitos(t)}</td>
      <td style={{ padding: "7px 0", fontSize: 12, color: obrigatorio ? "#8C2B22" : "#7A7472" }}>{obrigatorio ? "obrigatório" : "opcional"}</td>
    </tr>
  );
  return (
    <div className="table-scroll">
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
        <thead>
          <tr>
            {["Documento", "Formato", ""].map((h) => (
              <th key={h} style={{ ...rotulo, textAlign: "left", padding: "0 10px 6px 0", fontWeight: 400 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DOC_ORDER.map((t) => linha(t, true))}
          {DOC_OPCIONAIS.map((t) => linha(t, false))}
        </tbody>
      </table>
    </div>
  );
}

function RegrasDosEmpreendimentos({
  empreendimentos,
}: {
  empreendimentos: { id: string; nome: string; prazoDias: number; reenviosSemTaxa: number; prazoComplementoDias: number }[];
}) {
  if (empreendimentos.length === 0) return null;
  return (
    <div style={{ background: "#FAF9F6", border: "1px solid #EDE9E1", borderRadius: 4, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={rotulo}>Regras dos seus empreendimentos</div>
      {empreendimentos.map((e) => (
        <div key={e.id} style={{ fontSize: 13, color: "#3B4653", lineHeight: 1.5 }}>
          <strong>{e.nome}</strong>: análise em até {e.prazoDias} dias úteis após a validação documental · {e.reenviosSemTaxa} reenvios sem nova taxa ·
          até {e.prazoComplementoDias} dias para enviar a complementação
        </div>
      ))}
    </div>
  );
}

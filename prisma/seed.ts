// Seeds demo data ported from the Claude Design prototype (project/AprovaCAPE.dc.html):
// same empreendimento, lotes, solicitações, checklist and users, so the real app opens
// showing the exact scenario the design was reviewed against.
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import type { DocumentoTipo, SolicitacaoStatus, SolicitacaoTipo } from "../src/generated/prisma/enums";

const DEMO_PASSWORD = "cape2026!";

async function main() {
  await prisma.historicoEvento.deleteMany();
  await prisma.checklistResultado.deleteMany();
  await prisma.solicitacaoDocumento.deleteMany();
  await prisma.solicitacao.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.checklistCategoria.deleteMany();
  await prisma.lote.deleteMany();
  await prisma.quadra.deleteMany();
  await prisma.empreendimento.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Admin CAPE: mesma equipe interna, com acesso extra para cadastrar novos
  // empreendimentos e criar outras contas internas (analistas, síndicos, admins).
  await prisma.user.create({
    data: {
      name: "Eng. Denise Yamamoto",
      email: "denise@cape.eng.br",
      cpf: "111.111.111-11",
      birthDate: new Date("1985-04-12"),
      phone: "(11) 98888-1001",
      passwordHash,
      role: "ADMIN_CAPE",
      creaCau: "CREA 5069874/D",
    },
  });

  await prisma.user.create({
    data: {
      name: "Arq. Rafael Toledo",
      email: "rafael@cape.eng.br",
      cpf: "222.222.222-22",
      birthDate: new Date("1990-08-03"),
      phone: "(11) 98888-1002",
      passwordHash,
      role: "CAPE_ANALISTA",
      creaCau: "CAU A889021-3",
    },
  });

  const roberto = await prisma.user.create({
    data: {
      name: "Roberto Camargo Lisboa",
      email: "sindico@quintadaprimavera.com.br",
      cpf: "333.333.333-33",
      birthDate: new Date("1970-01-20"),
      phone: "(11) 98888-1003",
      passwordHash,
      role: "SINDICO",
    },
  });

  const marcos = await prisma.user.create({
    data: {
      name: "Marcos Aurélio Prado",
      email: "marcos.prado@gmail.com",
      cpf: "387.221.908-15",
      birthDate: new Date("1978-06-11"),
      phone: "(11) 97777-2001",
      passwordHash,
      role: "PROPRIETARIO",
      vinculoStatus: "APROVADO",
    },
  });

  const helena = await prisma.user.create({
    data: {
      name: "Helena Vasconcelos",
      email: "helena.v@outlook.com",
      cpf: "444.444.444-44",
      birthDate: new Date("1982-02-18"),
      phone: "(11) 97777-2002",
      passwordHash,
      role: "PROPRIETARIO",
      vinculoStatus: "APROVADO",
    },
  });

  const ana = await prisma.user.create({
    data: {
      name: "Ana Beltrão de Souza",
      email: "ana.beltrao@estudio.arq.br",
      cpf: "555.555.555-55",
      birthDate: new Date("1988-11-30"),
      phone: "(11) 96666-3001",
      passwordHash,
      role: "RESPONSAVEL_TECNICO",
      creaCau: "CAU A123456-7",
      vinculoStatus: "APROVADO",
    },
  });

  const outrosProfissionais: Record<string, { nome: string; email: string; cau: string }> = {
    "Marina Duarte": { nome: "Marina Duarte", email: "marina.duarte@estudio.arq.br", cau: "CAU A223456-1" },
    "Célia Andrade": { nome: "Célia Andrade", email: "celia.andrade@estudio.arq.br", cau: "CAU A323456-2" },
    "Tiago Serra": { nome: "Tiago Serra", email: "tiago.serra@estudio.arq.br", cau: "CREA 6011234/D" },
    "Paulo Nardini": { nome: "Paulo Nardini", email: "paulo.nardini@estudio.arq.br", cau: "CAU A423456-3" },
  };
  const rts: Record<string, { id: string }> = { "Ana Beltrão": ana };
  for (const [key, v] of Object.entries(outrosProfissionais)) {
    const u = await prisma.user.create({
      data: {
        name: v.nome,
        email: v.email,
        cpf: `6${Math.floor(Math.random() * 90000000000 + 10000000000)}`.slice(0, 14),
        birthDate: new Date("1985-01-01"),
        phone: "(11) 96666-0000",
        passwordHash,
        role: "RESPONSAVEL_TECNICO",
        creaCau: v.cau,
        vinculoStatus: "APROVADO",
      },
    });
    rts[key] = u;
  }

  // Pending vínculos: self-registered proprietário/RT awaiting CAPE review, per the "Vínculos a validar" panel.
  const camila = await prisma.user.create({
    data: {
      name: "Camila Rezende Moura",
      email: "camila.moura@gmail.com",
      cpf: "387.221.908-14",
      birthDate: new Date("1984-03-12"),
      phone: "(11) 98871-4402",
      passwordHash,
      role: "PROPRIETARIO",
      vinculoStatus: "PENDENTE",
      vinculoComprovacao: "Matrícula 148.902",
    },
  });
  const bruno = await prisma.user.create({
    data: {
      name: "Arq. Bruno Sartori",
      email: "bruno@sartoriarquitetura.com.br",
      cpf: "412.660.778-02",
      birthDate: new Date("1991-09-25"),
      phone: "(11) 99304-1187",
      passwordHash,
      role: "RESPONSAVEL_TECNICO",
      creaCau: "CAU A552108-4",
      vinculoStatus: "PENDENTE",
      vinculoComprovacao: "CAU A552108-4 · procuração anexa",
    },
  });

  const emp = await prisma.empreendimento.create({
    data: {
      nome: "Quinta da Primavera",
      cidade: "Jarinu",
      uf: "SP",
      numQuadras: 5,
      taxaAnaliseCent: 300000,
      prazoDias: 10,
      reenviosSemTaxa: 3,
      taxaVisitaCent: 60000,
      prazoComplementoDias: 180,
      plantaImageUrl: "/plantas/quinta-da-primavera.webp",
      sindicoId: roberto.id,
    },
  });

  const CATS: Array<[string, Array<[string, string, string]>]> = [
    ["Recuos e afastamentos", [
      ["r1", "Recuo frontal mínimo de 5,00 m atendido", "Art. 12 — Normativa do residencial"],
      ["r2", "Recuos laterais mínimos de 1,50 m em ambas as divisas", "Art. 12 §2º"],
      ["r3", "Recuo de fundos mínimo de 3,00 m atendido", "Art. 12 §3º"],
    ]],
    ["Gabarito e volumetria", [
      ["g1", "Máximo de 2 pavimentos acima do nível da rua", "Art. 15"],
      ["g2", "Altura máxima de 8,50 m até a cumeeira", "Art. 15 §1º"],
      ["g3", "Caixa d’água e casa de máquinas dentro do volume permitido", "Art. 15 §4º"],
    ]],
    ["Ocupação e permeabilidade", [
      ["o1", "Taxa de ocupação ≤ 50% da área do lote", "Art. 18"],
      ["o2", "Área permeável ≥ 20% da área do lote", "Art. 19"],
      ["o3", "Movimentação de terra e arrimos compatíveis com o lote vizinho", "Art. 21"],
    ]],
    ["Fachada e infraestrutura", [
      ["f1", "Materiais de fachada dentro do padrão do residencial", "Art. 24"],
      ["f2", "Muros de divisa no gabarito e acabamento previstos", "Art. 25"],
      ["f3", "Reservatório, fossa e ligações conforme projeto hidrossanitário", "Art. 28"],
      ["f4", "Calçada, guia rebaixada e acesso de veículos conforme padrão", "Art. 30"],
    ]],
  ];

  const itemById: Record<string, string> = {};
  let ordem = 0;
  for (const [nome, itens] of CATS) {
    const cat = await prisma.checklistCategoria.create({
      data: { empreendimentoId: emp.id, nome, ordem: ordem++ },
    });
    let itemOrdem = 0;
    for (const [id, texto, referencia] of itens) {
      const item = await prisma.checklistItem.create({
        data: { categoriaId: cat.id, texto, referencia, ordem: itemOrdem++ },
      });
      itemById[id] = item.id;
    }
  }

  const quadraByNome: Record<string, { id: string }> = {};
  for (const [nome, total] of [["Q1", 26], ["Q2", 24], ["Q3", 30], ["Q4", 22], ["Q5", 26]] as const) {
    quadraByNome[nome] = await prisma.quadra.create({
      data: { empreendimentoId: emp.id, nome, totalLotes: total },
    });
  }

  type LoteSeed = [string, string, string, SolicitacaoStatus, number, number, number, string, string, string, Array<[string, string, string, string]>];
  const LOTES: LoteSeed[] = [
    ["Q1", "04", "Rua dos Ipês, 15", "COMPLEMENTO", 2140, 29.2, 31.9, "Helena Vasconcelos", "Tiago Serra", "SOL-2026-039", [
      ["SOL-2026-039", "2026-05-29", "Ampliação de garagem 48 m² protocolada.", "#8FB0BF"],
      ["SOL-2026-039", "2026-06-04", "Documentação validada, análise técnica iniciada.", "#12455E"],
      ["SOL-2026-039", "2026-06-09", "Devolvida: memorial sem assinatura do RT e arrimo lateral sem detalhe. Reenvio 2 de 3.", "#B4711A"],
    ]],
    ["Q1", "15", "Rua dos Ipês, 92", "CONCLUIDA", 2380, 31.8, 30.2, "Cláudia Ferrari", "Marina Duarte", "SOL-2025-118", [
      ["SOL-2025-118", "2025-09-12", "Obra nova 268 m² protocolada.", "#8FB0BF"],
      ["SOL-2025-118", "2025-09-24", "Projeto aprovado sem ressalvas.", "#24603A"],
      ["SOL-2025-118", "2026-07-18", "Habite-se apresentado. Solicitação encerrada.", "#0E1B24"],
    ]],
    ["Q1", "21", "Rua dos Ipês, 140", "APROVADA", 2010, 36.8, 28.6, "Eduardo Naves", "Paulo Nardini", "SOL-2026-012", [
      ["SOL-2026-012", "2026-03-03", "Obra nova 214 m² protocolada.", "#8FB0BF"],
      ["SOL-2026-012", "2026-03-13", "Projeto aprovado. Aguardando alvará da Prefeitura de Jarinu.", "#24603A"],
    ]],
    ["Q2", "08", "Rua Quaresmeira, 51", "RESSALVAS", 2760, 26.8, 39.2, "Otávio Bianchi", "Marina Duarte", "SOL-2026-036", [
      ["SOL-2026-036", "2026-07-21", "Reforma de fachada protocolada.", "#8FB0BF"],
      ["SOL-2026-036", "2026-07-28", "Aprovada com ressalvas: revisar acabamento do muro de divisa.", "#4C6321"],
    ]],
    ["Q2", "14", "Rua Quaresmeira, 88", "APROVADA", 2220, 29.8, 43.1, "Juliana Rocha", "Ana Beltrão", "SOL-2026-008", [
      ["SOL-2026-008", "2026-02-14", "Obra nova 330 m² protocolada.", "#8FB0BF"],
      ["SOL-2026-008", "2026-02-20", "Devolvida: taxa de permeabilidade abaixo de 20%. Reenvio 1 de 3.", "#B4711A"],
      ["SOL-2026-008", "2026-03-02", "Reanálise apenas dos itens reprovados. Projeto aprovado.", "#24603A"],
    ]],
    ["Q3", "07", "Rua das Acácias, 118", "EXECUCAO", 2480, 52.0, 52.0, "Sérgio Lemos", "Ana Beltrão", "SOL-2026-028", [
      ["SOL-2026-028", "2026-06-02", "Obra nova 245 m² protocolada.", "#8FB0BF"],
      ["SOL-2026-028", "2026-06-12", "Projeto aprovado.", "#24603A"],
      ["SOL-2026-028", "2026-06-30", "Alvará de execução apresentado. Obra iniciada.", "#3B3486"],
    ]],
    ["Q3", "12", "Rua das Acácias, 240", "ANALISE", 2930, 56.0, 56.0, "Marcos Aurélio Prado", "Ana Beltrão", "SOL-2026-041", [
      ["SOL-2026-041", "2026-08-04", "Obra nova 312 m² protocolada.", "#8FB0BF"],
      ["SOL-2026-041", "2026-08-06", "Devolvida: memorial sem assinatura. Reenvio 1 de 3.", "#B4711A"],
      ["SOL-2026-041", "2026-08-08", "Em análise técnica com Eng. Denise Yamamoto. Prazo até 14/08.", "#12455E"],
    ]],
    ["Q3", "19", "Rua das Acácias, 310", "APROVADA", 2150, 60.0, 60.0, "Vera Lúcia Tanaka", "Célia Andrade", "SOL-2026-021", [
      ["SOL-2026-021", "2026-04-15", "Obra nova 190 m² protocolada.", "#8FB0BF"],
      ["SOL-2026-021", "2026-04-24", "Projeto aprovado.", "#24603A"],
    ]],
    ["Q4", "02", "Rua Manacá, 300", "REPROVADA", 3000, 72.0, 50.0, "Fernanda Kruger", "Célia Andrade", "SOL-2026-031", [
      ["SOL-2026-031", "2026-06-19", "Obra nova 690 m² protocolada.", "#8FB0BF"],
      ["SOL-2026-031", "2026-06-26", "Devolvida: gabarito e taxa de ocupação. Reenvios 1 e 2 de 3.", "#B4711A"],
      ["SOL-2026-031", "2026-07-28", "Reprovada no 3º reenvio. Nova análise exige nova taxa.", "#8C2B22"],
    ]],
    ["Q4", "11", "Rua Manacá, 366", "EXECUCAO", 2640, 76.0, 58.0, "Grupo Alvorada", "Paulo Nardini", "SOL-2025-097", [
      ["SOL-2025-097", "2025-08-08", "Obra nova 410 m² protocolada.", "#8FB0BF"],
      ["SOL-2025-097", "2025-08-19", "Projeto aprovado com ressalvas.", "#4C6321"],
      ["SOL-2025-097", "2025-10-03", "Obra iniciada.", "#3B3486"],
    ]],
    ["Q5", "06", "Rua Jacarandá, 20", "APROVADA", 2070, 35.0, 70.0, "Ricardo Salles Vieira", "Tiago Serra", "SOL-2026-017", [
      ["SOL-2026-017", "2026-03-25", "Obra nova 236 m² protocolada.", "#8FB0BF"],
      ["SOL-2026-017", "2026-04-02", "Projeto aprovado.", "#24603A"],
    ]],
    ["Q5", "21", "Rua Jacarandá, 88", "ENVIADA", 2850, 38.0, 74.0, "Construtora Vale Verde", "Paulo Nardini", "SOL-2026-044", [
      ["SOL-2026-044", "2026-08-16", "Obra nova 470 m² protocolada. Taxa de análise a pagar.", "#8FB0BF"],
    ]],
    ["Q5", "27", "Rua Jacarandá, 130", "CONCLUIDA", 2300, 36.5, 79.5, "Antônio Vilela", "Marina Duarte", "SOL-2025-064", [
      ["SOL-2025-064", "2025-04-14", "Obra nova 288 m² protocolada.", "#8FB0BF"],
      ["SOL-2025-064", "2025-04-25", "Projeto aprovado.", "#24603A"],
      ["SOL-2025-064", "2026-03-02", "Habite-se apresentado. Solicitação encerrada.", "#0E1B24"],
    ]],
  ];

  const tipoPorObra = (texto: string): SolicitacaoTipo => {
    if (/ampliaç/i.test(texto)) return "AMPLIACAO";
    if (/reforma/i.test(texto)) return "REFORMA";
    return "OBRA_NOVA";
  };

  const proprietarioPorNome: Record<string, string> = { "Marcos Aurélio Prado": marcos.id, "Helena Vasconcelos": helena.id };

  for (const [quadraNome, numero, rua, status, areaM2, x, y, propNome, rtNome, protocoloAtivo, hist] of LOTES) {
    let proprietarioId = proprietarioPorNome[propNome];
    if (!proprietarioId) {
      const u = await prisma.user.create({
        data: {
          name: propNome,
          email: `${propNome.toLowerCase().replace(/[^a-z]+/g, ".")}@exemplo.com.br`,
          cpf: `7${Math.floor(Math.random() * 90000000000 + 10000000000)}`.slice(0, 14),
          birthDate: new Date("1980-01-01"),
          phone: "(11) 95555-0000",
          passwordHash,
          role: "PROPRIETARIO",
          vinculoStatus: "APROVADO",
        },
      });
      proprietarioPorNome[propNome] = u.id;
      proprietarioId = u.id;
    }
    const rt = rts[rtNome];

    const lote = await prisma.lote.create({
      data: {
        empreendimentoId: emp.id,
        quadraId: quadraByNome[quadraNome].id,
        numero,
        rua,
        areaM2,
        posX: x,
        posY: y,
        proprietarioId,
        rtId: rt?.id,
      },
    });

    const protocolosNoHist = [...new Set(hist.map((h) => h[0]))];
    for (const protocolo of protocolosNoHist) {
      const isAtiva = protocolo === protocoloAtivo;
      const solStatus: SolicitacaoStatus = isAtiva ? status : "CONCLUIDA";
      const eventosDoProtocolo = hist.filter((h) => h[0] === protocolo);
      const reenvios = Math.max(0, eventosDoProtocolo.filter((h) => /devolvid|reenvio/i.test(h[2])).length);

      const sol = await prisma.solicitacao.create({
        data: {
          protocolo,
          loteId: lote.id,
          tipo: tipoPorObra(eventosDoProtocolo[0][2]),
          areaConstruida: Math.round(areaM2 * 0.14 * 10) / 10,
          descricao: eventosDoProtocolo[0][2],
          status: solStatus,
          prazoDias: 10,
          reenvios,
          pago: true,
          criadoPorId: proprietarioId,
          responsavelTecnicoNome: rtNome,
          responsavelTecnicoRegistro: rt ? "CAU A123456-7" : "—",
          responsavelTecnicoEmail: rt ? `${rtNome.toLowerCase().replace(/[^a-z]+/g, ".")}@estudio.arq.br` : "",
          documentacaoValidada: isAtiva ? status !== "ENVIADA" : true,
        },
      });

      for (const [, data, texto, cor] of eventosDoProtocolo) {
        await prisma.historicoEvento.create({
          data: { solicitacaoId: sol.id, texto, cor, createdAt: new Date(data) },
        });
      }

      if (solStatus !== "RASCUNHO") {
        const docsValidados = solStatus !== "ENVIADA";
        for (const tipo of DOC_ORDER) {
          await prisma.solicitacaoDocumento.create({
            data: {
              solicitacaoId: sol.id,
              tipo,
              nomeArquivo: `${tipo}.pdf`,
              caminhoArquivo: "",
              tamanhoBytes: 500_000,
              validado: docsValidados,
            },
          });
        }

        const allItemIds = Object.values(itemById);
        if (solStatus === "ANALISE") {
          // Partially decided: r3 reprovado, a handful of others already approved-and-locked.
          for (const [id, itemId] of Object.entries(itemById).slice(0, 6)) {
            const resultado = id === "r3" ? "REPROVADO" : "APROVADO";
            await prisma.checklistResultado.create({
              data: { solicitacaoId: sol.id, itemId, status: resultado, travado: resultado === "APROVADO", avaliadoEm: new Date() },
            });
          }
        } else if (solStatus === "COMPLEMENTO") {
          // Previously-approved items stay locked; the rest reopen pending the owner's fix.
          for (const [id, itemId] of Object.entries(itemById).slice(0, 5)) {
            if (id === "r3") continue;
            await prisma.checklistResultado.create({
              data: { solicitacaoId: sol.id, itemId, status: "APROVADO", travado: true, avaliadoEm: new Date() },
            });
          }
        } else if (["APROVADA", "RESSALVAS", "EXECUCAO", "CONCLUIDA"].includes(solStatus)) {
          for (const itemId of allItemIds) {
            await prisma.checklistResultado.create({
              data: { solicitacaoId: sol.id, itemId, status: "APROVADO", travado: true, avaliadoEm: new Date() },
            });
          }
        } else if (solStatus === "REPROVADA") {
          for (const itemId of allItemIds) {
            const reprovado = itemId === itemById["o1"];
            await prisma.checklistResultado.create({
              data: { solicitacaoId: sol.id, itemId, status: reprovado ? "REPROVADO" : "APROVADO", travado: !reprovado, avaliadoEm: new Date() },
            });
          }
        }
      }
    }
  }

  // Second empreendimento (no síndico assigned yet) — demonstrates the app being multi-cliente:
  // the CAPE team switches between developments, and each proprietário/RT/síndico only sees
  // the empreendimento(s) they're actually linked to.
  const empAltoDaSerra = await prisma.empreendimento.create({
    data: {
      nome: "Alto da Serra",
      cidade: "Atibaia",
      uf: "SP",
      numQuadras: 2,
      taxaAnaliseCent: 250000,
      prazoDias: 12,
      reenviosSemTaxa: 3,
      taxaVisitaCent: 50000,
      prazoComplementoDias: 180,
    },
  });

  const CATS_ALTO_DA_SERRA: Array<[string, Array<[string, string]>]> = [
    ["Recuos e afastamentos", [
      ["Recuo frontal mínimo de 4,00 m atendido", "Art. 9º — Normativa do residencial"],
      ["Recuos laterais mínimos de 1,50 m em ambas as divisas", "Art. 9º §2º"],
    ]],
    ["Ocupação e permeabilidade", [
      ["Taxa de ocupação ≤ 55% da área do lote", "Art. 14"],
      ["Área permeável ≥ 15% da área do lote", "Art. 15"],
    ]],
  ];
  let ordemAlto = 0;
  for (const [nome, itens] of CATS_ALTO_DA_SERRA) {
    const cat = await prisma.checklistCategoria.create({
      data: { empreendimentoId: empAltoDaSerra.id, nome, ordem: ordemAlto++ },
    });
    let itemOrdemAlto = 0;
    for (const [texto, referencia] of itens) {
      await prisma.checklistItem.create({ data: { categoriaId: cat.id, texto, referencia, ordem: itemOrdemAlto++ } });
    }
  }

  const quadraAltoQ1 = await prisma.quadra.create({ data: { empreendimentoId: empAltoDaSerra.id, nome: "Q1", totalLotes: 10 } });
  const quadraAltoQ2 = await prisma.quadra.create({ data: { empreendimentoId: empAltoDaSerra.id, nome: "Q2", totalLotes: 8 } });

  const patricia = await prisma.user.create({
    data: {
      name: "Patrícia Salgado Nogueira",
      email: "patricia.salgado@gmail.com",
      cpf: "888.888.888-88",
      birthDate: new Date("1979-05-22"),
      phone: "(11) 94444-5001",
      passwordHash,
      role: "PROPRIETARIO",
      vinculoStatus: "APROVADO",
    },
  });
  const igor = await prisma.user.create({
    data: {
      name: "Igor Matte",
      email: "igor.matte@estudio.arq.br",
      cpf: "999.999.999-99",
      birthDate: new Date("1986-07-14"),
      phone: "(11) 93333-6001",
      passwordHash,
      role: "RESPONSAVEL_TECNICO",
      creaCau: "CAU A667788-9",
      vinculoStatus: "APROVADO",
    },
  });

  const loteAlto1 = await prisma.lote.create({
    data: {
      empreendimentoId: empAltoDaSerra.id,
      quadraId: quadraAltoQ1.id,
      numero: "03",
      rua: "Rua das Grevíleas, 40",
      areaM2: 420,
      proprietarioId: patricia.id,
      rtId: igor.id,
    },
  });
  const loteAlto2 = await prisma.lote.create({
    data: {
      empreendimentoId: empAltoDaSerra.id,
      quadraId: quadraAltoQ2.id,
      numero: "10",
      rua: "Rua dos Pinheirais, 12",
      areaM2: 380,
      proprietarioId: patricia.id,
    },
  });

  const solAlto1 = await prisma.solicitacao.create({
    data: {
      protocolo: "SOL-2026-050",
      loteId: loteAlto1.id,
      tipo: "OBRA_NOVA",
      areaConstruida: 58,
      descricao: "Obra nova 210 m² protocolada.",
      status: "ANALISE",
      prazoDias: empAltoDaSerra.prazoDias,
      pago: true,
      criadoPorId: patricia.id,
      responsavelTecnicoNome: igor.name,
      responsavelTecnicoRegistro: "CAU A667788-9",
      responsavelTecnicoEmail: igor.email,
      documentacaoValidada: true,
    },
  });
  await prisma.historicoEvento.create({
    data: { solicitacaoId: solAlto1.id, texto: "Obra nova 210 m² protocolada.", cor: "#8FB0BF" },
  });
  await prisma.historicoEvento.create({
    data: { solicitacaoId: solAlto1.id, texto: "Documentação validada, análise técnica iniciada.", cor: "#12455E" },
  });
  for (const tipo of DOC_ORDER) {
    await prisma.solicitacaoDocumento.create({
      data: { solicitacaoId: solAlto1.id, tipo, nomeArquivo: `${tipo}.pdf`, caminhoArquivo: "", tamanhoBytes: 500_000, validado: true },
    });
  }

  const solAlto2 = await prisma.solicitacao.create({
    data: {
      protocolo: "SOL-2026-051",
      loteId: loteAlto2.id,
      tipo: "REFORMA",
      areaConstruida: 22,
      descricao: "Reforma de fachada protocolada. Taxa de análise a pagar.",
      status: "ENVIADA",
      prazoDias: empAltoDaSerra.prazoDias,
      pago: false,
      criadoPorId: patricia.id,
      responsavelTecnicoNome: patricia.name,
      responsavelTecnicoRegistro: "—",
      responsavelTecnicoEmail: patricia.email,
      documentacaoValidada: false,
    },
  });
  await prisma.historicoEvento.create({
    data: { solicitacaoId: solAlto2.id, texto: "Reforma de fachada protocolada. Taxa de análise a pagar.", cor: "#8FB0BF" },
  });
  for (const tipo of DOC_ORDER) {
    await prisma.solicitacaoDocumento.create({
      data: { solicitacaoId: solAlto2.id, tipo, nomeArquivo: `${tipo}.pdf`, caminhoArquivo: "", tamanhoBytes: 500_000, validado: false },
    });
  }

  // Pending vínculos reference lotes that exist but aren't the pending users' own yet.
  const q2l14 = await prisma.lote.findFirstOrThrow({ where: { quadra: { nome: "Q2" }, numero: "14" } });
  const q5l21 = await prisma.lote.findFirstOrThrow({ where: { quadra: { nome: "Q5" }, numero: "21" } });
  await prisma.user.update({ where: { id: camila.id }, data: { vinculoLoteId: q2l14.id } });
  await prisma.user.update({ where: { id: bruno.id }, data: { vinculoLoteId: q5l21.id } });

  console.log("Seed concluído.");
  console.log(`Senha de demonstração para todos os usuários: ${DEMO_PASSWORD}`);
  console.log("Login Admin CAPE: denise@cape.eng.br");
  console.log("Login Analista CAPE: rafael@cape.eng.br");
  console.log("Login Síndico (Quinta da Primavera): sindico@quintadaprimavera.com.br");
  console.log("Login Proprietário (Quinta da Primavera): marcos.prado@gmail.com");
  console.log("Login RT (Quinta da Primavera): ana.beltrao@estudio.arq.br");
  console.log("Login Proprietária (Alto da Serra): patricia.salgado@gmail.com");
}

const DOC_ORDER: DocumentoTipo[] = [
  "PROJETO_ARQUITETONICO",
  "ART_RRT",
  "MEMORIAL_DESCRITIVO",
  "PROJETO_ESTRUTURAL",
  "DOC_RESPONSAVEL_TECNICO",
];

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

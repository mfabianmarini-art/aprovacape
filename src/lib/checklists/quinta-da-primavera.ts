// Check-list de análise do Residencial Quinta da Primavera, conforme o regulamento interno
// do condomínio (referências entre parênteses na tabela da CAPE). Fonte única: alimenta o
// seed local e gerou a migração 20261020150000_checklist_quinta_da_primavera, que o
// instalou em produção.
//
// Um item por linha da tabela, com a mesma numeração. A primeira linha do texto é o título;
// as seguintes, os critérios (subitens a, b, c… da tabela), mostrados abaixo do título.

export type ItemChecklist = { codigo: string; texto: string; referencia: string };
export type CategoriaChecklist = { nome: string; itens: ItemChecklist[] };

const RECUOS_5_6 = "recuos de frente 10 m, laterais 5 m e fundos 6 m";
const RECUOS_3 = "recuos de frente 10 m, laterais 3 m e fundos 3 m";
const ref = (item: string, regulamento: string) => `Item ${item} · Regulamento ${regulamento}`;

export const CHECKLIST_QUINTA_DA_PRIMAVERA: CategoriaChecklist[] = [
  {
    nome: "Uso e parcelamento do lote",
    itens: [
      { codigo: "01", texto: "Residência unifamiliar", referencia: ref("01", "1.4") },
      {
        codigo: "02",
        texto: [
          "Unificação ou desmembramento de lotes contíguos",
          "a) Mantidas as dimensões e formatos dos lotes originais",
          "b) Divisão do lote original ao meio: não permitida",
          "c) Abertura de vielas, ruas, praças ou passagens de pedestres nas áreas comuns: não permitida",
          "d) Lotes com divisa para vielas não podem ser unificados",
          "e) Lotes unificados voltados para duas ruas: recuo de 10 m para as duas ruas",
        ].join("\n"),
        referencia: ref("02", "1.7"),
      },
      { codigo: "03", texto: "Documentação de aprovação da unificação na Prefeitura de Jarinu", referencia: ref("03", "1.7.1") },
    ],
  },
  {
    nome: "Índices urbanísticos",
    itens: [
      {
        codigo: "04",
        texto: [
          "Taxas de ocupação, aproveitamento e impermeabilização",
          "Taxa de ocupação (TO, “sombra”): até 30%",
          "Taxa de aproveitamento (soma das áreas dos pavimentos): até 55%",
          "Taxa de impermeabilização: até 50%",
        ].join("\n"),
        referencia: ref("04", "1.8"),
      },
      { codigo: "05", texto: "Área construída mínima: 10%", referencia: ref("05", "1.9") },
    ],
  },
  {
    nome: "Recuos, altura e volumetria",
    itens: [
      {
        codigo: "06",
        texto: [
          "Recuos",
          "Frente: 10 m",
          "Lateral direita: 5 m",
          "Lateral esquerda: 5 m",
          "Fundos: 6 m (lotes com fundo voltado para via pública: 10 m)",
          "Lotes de esquina: consultar o Anexo I",
        ].join("\n"),
        referencia: ref("06", "1.10 e 1.13"),
      },
      { codigo: "07", texto: "Cálculo da curva de concordância", referencia: ref("07", "1.10.1") },
      { codigo: "08", texto: "Altura total da construção, da soleira ao ponto mais alto do telhado: até 10 m", referencia: ref("08", "1.11") },
      {
        codigo: "09",
        texto: "Telhados modernos: caixa d’água e condensadoras ocultas pelo telhado ou por outro elemento construtivo, dentro dos 10 m de altura",
        referencia: ref("09", "1.11.1"),
      },
      { codigo: "10", texto: "Pavilhão de lazer maior que 40 m² fora dos recuos obrigatórios", referencia: ref("10", "1.12") },
      { codigo: "11", texto: "Beirais maiores que 1,50 m: o recuo é contado a partir de 1,00 m da alvenaria", referencia: ref("11", "1.13") },
    ],
  },
  {
    nome: "Muros, cercas e pavimentos",
    itens: [
      {
        codigo: "12",
        texto: [
          "Grades e muros sem função de arrimo somente a partir dos 10 m de recuo frontal",
          "Após os 10 m, individualização do imóvel por cerca viva sem espinhos ou vedação/muro de até 1,00 m",
          "a) Alambrados nos recuos com altura máxima de 1,00 m, ocultos por vegetação; trepadeira proibida",
          "b) Cerca viva nos recuos laterais e de fundos até 5 m",
          "c) Divisas laterais e de fundos com alamedas seguem o mesmo critério do item 1.14",
        ].join("\n"),
        referencia: ref("12", "1.14"),
      },
      { codigo: "13", texto: "Cercas vivas", referencia: ref("13", "1.15 e 1.16") },
      {
        codigo: "14",
        texto: [
          "Habitação com 2 pavimentos (térreo e superior)",
          "Exceções:",
          "a) Declividade maior que 15%: terceiro pavimento inferior com área de até 25% da projeção do térreo (pavimento imediatamente superior)",
          "b) Sótão utilizável quando o estilo arquitetônico induzir a essa solução, observada a altura máxima de 10 m",
        ].join("\n"),
        referencia: ref("14", "1.17"),
      },
    ],
  },
  {
    nome: "Terreno: arrimos, cortes e aterros",
    itens: [
      {
        codigo: "15",
        texto: [
          "Arrimos no recuo frontal e cortes e aterros",
          "Arrimo no recuo frontal:",
          "a) Até 1,00 m, contado a partir do PNT onde será edificado; face com acabamento mínimo de chapisco e pintada na cor verde",
          "b) Até 2,00 m a partir do afastamento de 3,00 m da testada do lote, contado a partir do PNT; face com acabamento mínimo de chapisco e pintada na cor verde",
          "Cortes e aterros:",
          "a) Sem arrimo, nos recuos: até 1,50 m a partir do PNT",
          "b) Sem arrimo, fora dos recuos: até 2,00 m a partir do PNT",
        ].join("\n"),
        referencia: ref("15", "1.18"),
      },
      { codigo: "16", texto: "Cortes e aterros sem arrimo superiores a 2,00 m aprovados pelo conselho da ARQP", referencia: ref("16", "1.19") },
      { codigo: "17", texto: "Inclinação máxima do talude: 45º", referencia: ref("17", "Gráfico 7") },
    ],
  },
  {
    nome: "Lazer e construções acessórias",
    itens: [
      {
        codigo: "18",
        texto: "Piscinas, decks e quadras esportivas descobertas a no mínimo 3,00 m das divisas laterais e de fundos (podem ocupar parcialmente os recuos)",
        referencia: ref("18", "1.20"),
      },
      { codigo: "19", texto: "Iluminação para quadras esportivas", referencia: ref("19", "1.20") },
      {
        codigo: "20",
        texto: [
          "Obras consideradas “exóticas”",
          `a) Pergolados: até 40 m², cobertos ou não; cobertura em vidro ou policarbonato; ${RECUOS_5_6}; devem constar na planta de aprovação`,
          `b) Quiosques: pilar central único; área total até 30 m²; 1 por residência; ${RECUOS_5_6}; vale também para quiosques da piscina`,
          `c) Viveiros de plantas, estufas e gazebos: 1 por residência, até 40 m² de projeção no solo somados; cobertura em vidro, policarbonato ou sombrite; ${RECUOS_5_6}`,
          "d) Iluminação: sem projeção direta e intensa para fora do lote; sem ofuscamento ou outro impacto nocivo à visão de vizinhos e transeuntes",
          `e) Colunas, obeliscos e pórticos decorativos: apenas como elementos paisagísticos, nunca como suporte de cobertura; ${RECUOS_5_6}`,
          "f) Mobiliário de jardim: não é permitido mobiliário fixo nos recuos",
          `g) Hortas e floreiras: base com altura máxima de 80 cm; ${RECUOS_3}`,
          `h) Canis: junto ao corpo principal da obra, com fechamento que impeça a visão dos lotes lindeiros; ${RECUOS_5_6}`,
          `i) Equipamentos, instalações, casa de bonecas e brinquedos infantis: uso não alterado com o tempo; casa de bonecas até 30 m²; ${RECUOS_5_6}`,
          `j) Fontes: altura até 2,20 m; ${RECUOS_3}`,
          "k) Espelhos d’água: recuo de 3,00 m de todas as divisas, sem ultrapassar o nível do piso",
          `l) Fogo de chão: ${RECUOS_5_6}`,
          "m) Poços artesianos: consulta prévia ao departamento de engenharia e meio ambiente da ARQP antes da perfuração; recuo de 2,00 m de todas as divisas; resíduos da perfuração em caçambas de entulho, nunca nas bocas de lobo",
        ].join("\n"),
        referencia: ref("20", "1.22"),
      },
    ],
  },
  {
    nome: "Instalações e equipamentos",
    itens: [
      {
        codigo: "21",
        texto: "Ligações externas de luz, energia, telefone, campainha ou similares subterrâneas entre a via pública e a edificação principal",
        referencia: ref("21", "1.23"),
      },
      { codigo: "22", texto: "Padrões de água, energia elétrica e outros fora dos recuos e afastamentos", referencia: ref("22", "1.24") },
      { codigo: "23", texto: `Antenas ocultas por vegetação, respeitando os ${RECUOS_3}`, referencia: ref("23", "1.26") },
      {
        codigo: "24",
        texto: [
          "Equipamentos produtores de ruído junto à construção principal, enterrados ou encobertos por paisagismo",
          "Transformadores, geradores, aquecedores, trocadores de calor, casa de máquinas, aparelhos de ar-condicionado e similares",
          `Respeitar os ${RECUOS_3}`,
        ].join("\n"),
        referencia: ref("24", "1.28"),
      },
      { codigo: "25", texto: "Cisternas enterradas para água de chuva com afastamento de 3,00 m das divisas", referencia: ref("25", "1.31") },
    ],
  },
  {
    nome: "Passeio, paisagismo e sistema construtivo",
    itens: [
      { codigo: "26", texto: "Passeios gramados e acessos de veículos de acordo com o padrão", referencia: ref("26", "1.32 e 1.54") },
      { codigo: "27", texto: "Grama esmeralda ou são-carlos na faixa de passeio", referencia: ref("27", "1.34") },
      {
        codigo: "28",
        texto: "Sem árvores de grande porte com sistema radicular agressivo a menos de 3,00 m das divisas",
        referencia: ref("28", "1.36"),
      },
      { codigo: "29", texto: "Casa “pré-fabricada”: não permitida", referencia: ref("29", "1.46") },
    ],
  },
  {
    nome: "Elementos obrigatórios do projeto",
    itens: [
      {
        codigo: "30",
        texto: [
          "Elementos obrigatórios de projeto",
          "a) Indicação de curvas de nível",
          "b) Implantação dos pavimentos separados",
          "c) Implantação geral",
          "d) Fachadas",
          "e) Cortes longitudinal e transversal indicando o PNT e o perfil projetado",
          "f) Área do pavimento térreo",
          "g) Área do pavimento superior",
          "h) Área das construções acessórias",
          "i) Somatório das áreas construídas",
          "j) Área da piscina",
        ].join("\n"),
        referencia: ref("30", "1.50"),
      },
    ],
  },
];

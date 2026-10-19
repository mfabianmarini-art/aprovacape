-- Check-list do Residencial Quinta da Primavera conforme o regulamento interno
-- (src/lib/checklists/quinta-da-primavera.ts). O check-list anterior é arquivado, não
-- apagado: solicitações já analisadas mantêm as decisões sobre os itens antigos.

-- AlterTable
ALTER TABLE "ChecklistCategoria" ADD COLUMN     "arquivadaEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ChecklistItem" ADD COLUMN     "arquivadoEm" TIMESTAMP(3);


DO $$
DECLARE
  emp text;
  n int;
BEGIN
  SELECT count(*) INTO n FROM "Empreendimento" WHERE lower(trim("nome")) = 'quinta da primavera';
  IF n <> 1 THEN
    RAISE NOTICE 'Check-list Quinta da Primavera não instalado: % empreendimento(s) com esse nome.', n;
    RETURN;
  END IF;
  SELECT "id" INTO emp FROM "Empreendimento" WHERE lower(trim("nome")) = 'quinta da primavera';

  UPDATE "ChecklistCategoria" SET "arquivadaEm" = now() WHERE "empreendimentoId" = emp AND "arquivadaEm" IS NULL;

  INSERT INTO "ChecklistCategoria" ("id", "empreendimentoId", "nome", "ordem") VALUES ('ckc' || md5(emp || ':cat1'), emp, $q$Uso e parcelamento do lote$q$, 0);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item01'), 'ckc' || md5(emp || ':cat1'), $q$Residência unifamiliar$q$, $q$Item 01 · Regulamento 1.4$q$, 0);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item02'), 'ckc' || md5(emp || ':cat1'), $q$Unificação ou desmembramento de lotes contíguos
a) Mantidas as dimensões e formatos dos lotes originais
b) Divisão do lote original ao meio: não permitida
c) Abertura de vielas, ruas, praças ou passagens de pedestres nas áreas comuns: não permitida
d) Lotes com divisa para vielas não podem ser unificados
e) Lotes unificados voltados para duas ruas: recuo de 10 m para as duas ruas$q$, $q$Item 02 · Regulamento 1.7$q$, 1);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item03'), 'ckc' || md5(emp || ':cat1'), $q$Documentação de aprovação da unificação na Prefeitura de Jarinu$q$, $q$Item 03 · Regulamento 1.7.1$q$, 2);
  INSERT INTO "ChecklistCategoria" ("id", "empreendimentoId", "nome", "ordem") VALUES ('ckc' || md5(emp || ':cat2'), emp, $q$Índices urbanísticos$q$, 1);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item04'), 'ckc' || md5(emp || ':cat2'), $q$Taxas de ocupação, aproveitamento e impermeabilização
Taxa de ocupação (TO, “sombra”): até 30%
Taxa de aproveitamento (soma das áreas dos pavimentos): até 55%
Taxa de impermeabilização: até 50%$q$, $q$Item 04 · Regulamento 1.8$q$, 0);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item05'), 'ckc' || md5(emp || ':cat2'), $q$Área construída mínima: 10%$q$, $q$Item 05 · Regulamento 1.9$q$, 1);
  INSERT INTO "ChecklistCategoria" ("id", "empreendimentoId", "nome", "ordem") VALUES ('ckc' || md5(emp || ':cat3'), emp, $q$Recuos, altura e volumetria$q$, 2);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item06'), 'ckc' || md5(emp || ':cat3'), $q$Recuos
Frente: 10 m
Lateral direita: 5 m
Lateral esquerda: 5 m
Fundos: 6 m (lotes com fundo voltado para via pública: 10 m)
Lotes de esquina: consultar o Anexo I$q$, $q$Item 06 · Regulamento 1.10 e 1.13$q$, 0);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item07'), 'ckc' || md5(emp || ':cat3'), $q$Cálculo da curva de concordância$q$, $q$Item 07 · Regulamento 1.10.1$q$, 1);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item08'), 'ckc' || md5(emp || ':cat3'), $q$Altura total da construção, da soleira ao ponto mais alto do telhado: até 10 m$q$, $q$Item 08 · Regulamento 1.11$q$, 2);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item09'), 'ckc' || md5(emp || ':cat3'), $q$Telhados modernos: caixa d’água e condensadoras ocultas pelo telhado ou por outro elemento construtivo, dentro dos 10 m de altura$q$, $q$Item 09 · Regulamento 1.11.1$q$, 3);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item10'), 'ckc' || md5(emp || ':cat3'), $q$Pavilhão de lazer maior que 40 m² fora dos recuos obrigatórios$q$, $q$Item 10 · Regulamento 1.12$q$, 4);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item11'), 'ckc' || md5(emp || ':cat3'), $q$Beirais maiores que 1,50 m: o recuo é contado a partir de 1,00 m da alvenaria$q$, $q$Item 11 · Regulamento 1.13$q$, 5);
  INSERT INTO "ChecklistCategoria" ("id", "empreendimentoId", "nome", "ordem") VALUES ('ckc' || md5(emp || ':cat4'), emp, $q$Muros, cercas e pavimentos$q$, 3);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item12'), 'ckc' || md5(emp || ':cat4'), $q$Grades e muros sem função de arrimo somente a partir dos 10 m de recuo frontal
Após os 10 m, individualização do imóvel por cerca viva sem espinhos ou vedação/muro de até 1,00 m
a) Alambrados nos recuos com altura máxima de 1,00 m, ocultos por vegetação; trepadeira proibida
b) Cerca viva nos recuos laterais e de fundos até 5 m
c) Divisas laterais e de fundos com alamedas seguem o mesmo critério do item 1.14$q$, $q$Item 12 · Regulamento 1.14$q$, 0);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item13'), 'ckc' || md5(emp || ':cat4'), $q$Cercas vivas$q$, $q$Item 13 · Regulamento 1.15 e 1.16$q$, 1);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item14'), 'ckc' || md5(emp || ':cat4'), $q$Habitação com 2 pavimentos (térreo e superior)
Exceções:
a) Declividade maior que 15%: terceiro pavimento inferior com área de até 25% da projeção do térreo (pavimento imediatamente superior)
b) Sótão utilizável quando o estilo arquitetônico induzir a essa solução, observada a altura máxima de 10 m$q$, $q$Item 14 · Regulamento 1.17$q$, 2);
  INSERT INTO "ChecklistCategoria" ("id", "empreendimentoId", "nome", "ordem") VALUES ('ckc' || md5(emp || ':cat5'), emp, $q$Terreno: arrimos, cortes e aterros$q$, 4);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item15'), 'ckc' || md5(emp || ':cat5'), $q$Arrimos no recuo frontal e cortes e aterros
Arrimo no recuo frontal:
a) Até 1,00 m, contado a partir do PNT onde será edificado; face com acabamento mínimo de chapisco e pintada na cor verde
b) Até 2,00 m a partir do afastamento de 3,00 m da testada do lote, contado a partir do PNT; face com acabamento mínimo de chapisco e pintada na cor verde
Cortes e aterros:
a) Sem arrimo, nos recuos: até 1,50 m a partir do PNT
b) Sem arrimo, fora dos recuos: até 2,00 m a partir do PNT$q$, $q$Item 15 · Regulamento 1.18$q$, 0);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item16'), 'ckc' || md5(emp || ':cat5'), $q$Cortes e aterros sem arrimo superiores a 2,00 m aprovados pelo conselho da ARQP$q$, $q$Item 16 · Regulamento 1.19$q$, 1);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item17'), 'ckc' || md5(emp || ':cat5'), $q$Inclinação máxima do talude: 45º$q$, $q$Item 17 · Regulamento Gráfico 7$q$, 2);
  INSERT INTO "ChecklistCategoria" ("id", "empreendimentoId", "nome", "ordem") VALUES ('ckc' || md5(emp || ':cat6'), emp, $q$Lazer e construções acessórias$q$, 5);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item18'), 'ckc' || md5(emp || ':cat6'), $q$Piscinas, decks e quadras esportivas descobertas a no mínimo 3,00 m das divisas laterais e de fundos (podem ocupar parcialmente os recuos)$q$, $q$Item 18 · Regulamento 1.20$q$, 0);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item19'), 'ckc' || md5(emp || ':cat6'), $q$Iluminação para quadras esportivas$q$, $q$Item 19 · Regulamento 1.20$q$, 1);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item20'), 'ckc' || md5(emp || ':cat6'), $q$Obras consideradas “exóticas”
a) Pergolados: até 40 m², cobertos ou não; cobertura em vidro ou policarbonato; recuos de frente 10 m, laterais 5 m e fundos 6 m; devem constar na planta de aprovação
b) Quiosques: pilar central único; área total até 30 m²; 1 por residência; recuos de frente 10 m, laterais 5 m e fundos 6 m; vale também para quiosques da piscina
c) Viveiros de plantas, estufas e gazebos: 1 por residência, até 40 m² de projeção no solo somados; cobertura em vidro, policarbonato ou sombrite; recuos de frente 10 m, laterais 5 m e fundos 6 m
d) Iluminação: sem projeção direta e intensa para fora do lote; sem ofuscamento ou outro impacto nocivo à visão de vizinhos e transeuntes
e) Colunas, obeliscos e pórticos decorativos: apenas como elementos paisagísticos, nunca como suporte de cobertura; recuos de frente 10 m, laterais 5 m e fundos 6 m
f) Mobiliário de jardim: não é permitido mobiliário fixo nos recuos
g) Hortas e floreiras: base com altura máxima de 80 cm; recuos de frente 10 m, laterais 3 m e fundos 3 m
h) Canis: junto ao corpo principal da obra, com fechamento que impeça a visão dos lotes lindeiros; recuos de frente 10 m, laterais 5 m e fundos 6 m
i) Equipamentos, instalações, casa de bonecas e brinquedos infantis: uso não alterado com o tempo; casa de bonecas até 30 m²; recuos de frente 10 m, laterais 5 m e fundos 6 m
j) Fontes: altura até 2,20 m; recuos de frente 10 m, laterais 3 m e fundos 3 m
k) Espelhos d’água: recuo de 3,00 m de todas as divisas, sem ultrapassar o nível do piso
l) Fogo de chão: recuos de frente 10 m, laterais 5 m e fundos 6 m
m) Poços artesianos: consulta prévia ao departamento de engenharia e meio ambiente da ARQP antes da perfuração; recuo de 2,00 m de todas as divisas; resíduos da perfuração em caçambas de entulho, nunca nas bocas de lobo$q$, $q$Item 20 · Regulamento 1.22$q$, 2);
  INSERT INTO "ChecklistCategoria" ("id", "empreendimentoId", "nome", "ordem") VALUES ('ckc' || md5(emp || ':cat7'), emp, $q$Instalações e equipamentos$q$, 6);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item21'), 'ckc' || md5(emp || ':cat7'), $q$Ligações externas de luz, energia, telefone, campainha ou similares subterrâneas entre a via pública e a edificação principal$q$, $q$Item 21 · Regulamento 1.23$q$, 0);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item22'), 'ckc' || md5(emp || ':cat7'), $q$Padrões de água, energia elétrica e outros fora dos recuos e afastamentos$q$, $q$Item 22 · Regulamento 1.24$q$, 1);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item23'), 'ckc' || md5(emp || ':cat7'), $q$Antenas ocultas por vegetação, respeitando os recuos de frente 10 m, laterais 3 m e fundos 3 m$q$, $q$Item 23 · Regulamento 1.26$q$, 2);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item24'), 'ckc' || md5(emp || ':cat7'), $q$Equipamentos produtores de ruído junto à construção principal, enterrados ou encobertos por paisagismo
Transformadores, geradores, aquecedores, trocadores de calor, casa de máquinas, aparelhos de ar-condicionado e similares
Respeitar os recuos de frente 10 m, laterais 3 m e fundos 3 m$q$, $q$Item 24 · Regulamento 1.28$q$, 3);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item25'), 'ckc' || md5(emp || ':cat7'), $q$Cisternas enterradas para água de chuva com afastamento de 3,00 m das divisas$q$, $q$Item 25 · Regulamento 1.31$q$, 4);
  INSERT INTO "ChecklistCategoria" ("id", "empreendimentoId", "nome", "ordem") VALUES ('ckc' || md5(emp || ':cat8'), emp, $q$Passeio, paisagismo e sistema construtivo$q$, 7);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item26'), 'ckc' || md5(emp || ':cat8'), $q$Passeios gramados e acessos de veículos de acordo com o padrão$q$, $q$Item 26 · Regulamento 1.32 e 1.54$q$, 0);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item27'), 'ckc' || md5(emp || ':cat8'), $q$Grama esmeralda ou são-carlos na faixa de passeio$q$, $q$Item 27 · Regulamento 1.34$q$, 1);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item28'), 'ckc' || md5(emp || ':cat8'), $q$Sem árvores de grande porte com sistema radicular agressivo a menos de 3,00 m das divisas$q$, $q$Item 28 · Regulamento 1.36$q$, 2);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item29'), 'ckc' || md5(emp || ':cat8'), $q$Casa “pré-fabricada”: não permitida$q$, $q$Item 29 · Regulamento 1.46$q$, 3);
  INSERT INTO "ChecklistCategoria" ("id", "empreendimentoId", "nome", "ordem") VALUES ('ckc' || md5(emp || ':cat9'), emp, $q$Elementos obrigatórios do projeto$q$, 8);
  INSERT INTO "ChecklistItem" ("id", "categoriaId", "texto", "referencia", "ordem") VALUES ('cki' || md5(emp || ':item30'), 'ckc' || md5(emp || ':cat9'), $q$Elementos obrigatórios de projeto
a) Indicação de curvas de nível
b) Implantação dos pavimentos separados
c) Implantação geral
d) Fachadas
e) Cortes longitudinal e transversal indicando o PNT e o perfil projetado
f) Área do pavimento térreo
g) Área do pavimento superior
h) Área das construções acessórias
i) Somatório das áreas construídas
j) Área da piscina$q$, $q$Item 30 · Regulamento 1.50$q$, 0);
END $$;

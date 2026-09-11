# CAPE Aprova

Plataforma web para receber, analisar, aprovar ou reprovar solicitações de obras em lotes de condomínios horizontais administrados pela CAPE Engenharia.

Implementação real (Next.js + banco de dados + autenticação + upload de arquivos) a partir do protótipo de design em `AprovaCAPE.dc.html` (Claude Design) e do briefing nos chats do handoff.

## Stack

- **Next.js 16** (App Router, Turbopack, React 19) + TypeScript
- **Prisma 7** + **Postgres** (Neon, via `@prisma/adapter-pg`) — `DATABASE_URL` configurado como variável de ambiente (local em `.env`/`.env.local`, em produção via integração Neon da Vercel)
- **Auth.js (NextAuth v5)** com provider de credenciais (e-mail/CPF + senha, sessão JWT) — requer `AUTH_SECRET`
- Upload de arquivos no **Vercel Blob** (store privado): documentos de solicitação servidos por `/api/files/[docId]`, plantas enviadas pelo analista servidas por `/api/plantas/[...path]` — ambos com checagem de sessão. A planta de demonstração (`quinta-da-primavera.webp`) continua estática em `public/plantas/`.

## Deploy (Vercel)

Projeto vinculado em `mfabianmarini-arts-projects/aprovacape`, com GitHub conectado (`mfabianmarini-art/aprovacape`, branch `main`) para deploy automático a cada push. Recursos provisionados: Postgres (Neon, integração de marketplace) e um Blob store privado (`aprovacape-uploads`) — variáveis `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` e `AUTH_SECRET` já configuradas em Production/Preview/Development no painel da Vercel. O script `build` roda `prisma migrate deploy` antes de `next build`, então toda migration commitada em `prisma/migrations` é aplicada automaticamente no banco de produção a cada deploy.

## Rodando localmente

```bash
npm install                # também roda `prisma generate` via postinstall
vercel env pull .env.local # baixa DATABASE_URL, BLOB_READ_WRITE_TOKEN, AUTH_SECRET etc.
npm run db:migrate         # aplica as migrations no Postgres
npm run db:seed            # popula com o cenário do protótipo (Quinta da Primavera)
npm run dev
```

Abra http://localhost:3000 — a rota raiz redireciona para `/login` ou para a tela inicial do papel logado.

## Contas de demonstração

Senha para todas: **`cape2026!`**

| Papel | Login |
| --- | --- |
| Admin CAPE | `denise@cape.eng.br` |
| Analista CAPE | `rafael@cape.eng.br` |
| Síndico (somente leitura, Quinta da Primavera) | `sindico@quintadaprimavera.com.br` |
| Proprietário (Quinta da Primavera) | `marcos.prado@gmail.com` |
| Responsável técnico (Quinta da Primavera) | `ana.beltrao@estudio.arq.br` |
| Proprietária (Alto da Serra) | `patricia.salgado@gmail.com` |

O seed cadastra dois empreendimentos (Quinta da Primavera e Alto da Serra) para demonstrar o uso multi-cliente.

**Bloqueio por tentativas**: 5 falhas consecutivas de senha bloqueiam o login daquela conta por 15 minutos (`tentativasLogin`/`bloqueadoAte` em `User`, aplicado no `authorize` de `src/lib/auth.ts`). O contador zera a cada login bem-sucedido e o bloqueio expira sozinho — como não há provedor de e-mail para recuperação de conta, um bloqueio permanente trancaria a pessoa para fora.

Login por e-mail **ou** CPF. Novas contas de proprietário/RT são criadas por auto-cadastro em `/login`; contas de analista CAPE e admin CAPE são criadas na tela **Equipe CAPE** por um analista já logado; o síndico é criado dentro do empreendimento que ele vai gerir (tela **Empreendimentos**), porque é esse vínculo que define o que ele enxerga.

## Telas

`/login` (cadastro + login) · `/resumo` · `/fila` · `/vinculos` · `/analise/[protocolo]` · `/requerimentos` · `/nova` (wizard de 3 passos) · `/empreendimentos` · `/checklists` · `/usuarios` · `/documentos` — visibilidade e navegação por papel definidas em `src/lib/nav.ts`.

## Multi-cliente (múltiplos empreendimentos)

A plataforma atende vários empreendimentos (condomínios/loteamentos) ao mesmo tempo:

- **Admin CAPE** (`ADMIN_CAPE`) cadastra novos empreendimentos pela tela **Empreendimentos** e cria outras contas da equipe CAPE (analistas e outros admins) na tela **Equipe CAPE**. Tem acesso total, igual ao Analista CAPE.
- **Analista CAPE** (`CAPE_ANALISTA`) enxerga todos os empreendimentos, mas não cria novos — só edita configuração, planta e check-list dos existentes.
- As telas **Resumo**, **Check-lists** e **Empreendimentos** têm um seletor de empreendimento no topo quando há mais de um cadastrado; a **Fila de análise** reúne as solicitações de todos os empreendimentos, com filtro opcional para restringir a um deles.
- **Síndico**: cada empreendimento tem no máximo um síndico vinculado (`Empreendimento.sindicoId`); o síndico só enxerga o(s) empreendimento(s) aos quais está vinculado. O vínculo é criado e trocado na seção "Usuários deste empreendimento" da tela Empreendimentos — criar um síndico por lá já o vincula, e um síndico existente pode ser vinculado ou desvinculado a qualquer momento.
- **Proprietário / Responsável técnico**: o vínculo é por lote (`Lote.proprietarioId`/`Lote.rtId`), e o lote pertence a um empreendimento — o auto-cadastro em `/login` já pede para escolher o empreendimento, a quadra e o lote.

A **habilitação profissional** (do RT no auto-cadastro e da equipe técnica da CAPE) é gravada em três campos separados: `conselho` (enum `CREA`/`CAU`), `registroNumero` e `registroUf` — a UF é a que emitiu o registro, já que o número só identifica o profissional dentro do conselho estadual. `formatRegistro` (`src/lib/registro-profissional.ts`) compõe a exibição ("CREA 5069874/D-SP"). Cadastros anteriores à separação dos campos podem ter a UF nula.

Quadras são cadastradas pela tela Empreendimentos (na criação do empreendimento ou depois, em "Quadras e lotes"), com nome livre e quantidade de lotes independente por quadra — não precisam seguir sequência numérica nem ter a mesma quantidade entre si. Uma quadra com lotes já cadastrados não pode ser removida por lá. Clicando em uma quadra (▸), abre o cadastro dos lotes dela: o gestor CAPE cadastra só o **número** do lote (e, se a planta já foi enviada, sua posição no mapa, clicando nela). **Endereço e área do lote** ficam em branco até o proprietário/RT vinculado preenchê-los na primeira solicitação de obra desse lote (`/nova`, passo 1) — por isso `Lote.rua` e `Lote.areaM2` são opcionais no banco. Um lote com proprietário/RT vinculado não pode ser removido por lá.

**Documentos técnicos** (model `DocumentoTecnico`): biblioteca de referência por empreendimento — manual do proprietário, convenção do condomínio, regulamentos e outros materiais que ajudam o proprietário/RT a elaborar o projeto. Cada documento tem um **título** e uma **descrição** opcional (`descricao`), que é onde se explica do que trata o arquivo ou o parecer — é o texto que orienta o proprietário/RT na hora de consultar. A equipe CAPE publica pela tela **Empreendimentos** (seção "Documentos técnicos"), em qualquer empreendimento; o **síndico** publica pela própria tela `/documentos`, restrito ao empreendimento que administra (`Empreendimento.sindicoId`). Para Proprietário e Responsável técnico a tela é só de consulta. No menu, `/documentos` aparece apenas para Síndico, Proprietário e Responsável técnico — para os papéis CAPE seria redundante — e sempre restrita ao(s) empreendimento(s) aos quais eles têm acesso. Para **Proprietário e RT é o primeiro item do menu e a tela de entrada** (`homeForRole` usa o primeiro item da lista filtrada), já que é a referência que consultam antes de elaborar o projeto; o síndico continua entrando pelo Resumo. A mesma tela muda de nome conforme quem olha: para Proprietário e RT chama-se **"Normas para aprovação"**, porque para eles é o que o projeto precisa atender; para o síndico, que publica ali, continua "Documentos técnicos". O nome sai de `labelPorPapel` em `src/lib/nav.ts`, lido tanto pela barra lateral quanto pelo cabeçalho da tela (`labelDaTela`), para os dois não divergirem. Proprietário e RT com **vínculo ainda em análise** já enxergam os documentos do empreendimento do lote informado: são a referência para elaborar o projeto, e esperar a aprovação só atrasaria isso. Vínculo **recusado** não dá acesso — a recusa só troca o `vinculoStatus`, então tanto a query quanto a rota de download filtram por `PENDENTE` explicitamente. Arquivos aceitos: PDF, Word ou imagem, até 20 MB, guardados no Vercel Blob e servidos por `/api/documentos-tecnicos/[docId]` com checagem de permissão.

## Lógica de negócio implementada

- **Validação documental → check-list**: o check-list técnico só libera depois que todos os documentos de `DOC_ORDER` são marcados como validados pelo analista. A validação **sobrevive ao reenvio**: só o arquivo substituído volta a `validado = false` (isso acontece no próprio upload), então a cada rodada o analista reconfere apenas o que mudou — marcado com a etiqueta "reanalisar" na tela de análise. `documentacaoValidada` é recalculado no reenvio a partir do estado real dos documentos.
- **Rascunhos**: o passo 1 de `/nova` lista as solicitações em `RASCUNHO` do usuário ("Solicitações em andamento"), com quantos documentos já foram anexados, botão para retomar no passo certo e para descartar. Rascunho não aparece em `/requerimentos` nem entra no contador do menu — só conta o que a CAPE recebeu.
- **Documentos da solicitação** (`DOC_REGRAS` em `src/lib/status.ts`): projeto arquitetônico e projeto estrutural aceitam PDF ou DWG; ART/RRT e memorial descritivo, só PDF. O limite é de 5 MB por arquivo. O DWG é validado por extensão e pelo código de versão nos primeiros bytes do arquivo — a CAPE abre os projetos em AutoCAD 2010, então DWG gravado em versão posterior é recusado no envio, com a mensagem dizendo como salvar. O tipo declarado pelo navegador não é usado nem na validação (DWG costuma vir sem tipo) nem ao servir o arquivo, onde o Content-Type sai da extensão já validada.
- **Observações da análise**: documento não validado e item de check-list reprovado abrem um campo de texto (`observacao` em `SolicitacaoDocumento` e `ChecklistResultado`, até 1000 caracteres, salvo ao sair do campo) onde o analista descreve o que falta ou o que não atendeu a norma. O texto aparece para proprietário e RT em `/requerimentos`, no bloco "O que a CAPE apontou", agrupado por documento e por item com a referência normativa. Validar o documento ou aprovar o item limpa a observação, para a lista não guardar pendência já resolvida; a devolução do parecer devolve o item a `PENDENTE` mas preserva o texto, que é justamente o que orienta a correção.
- **Complementação**: com a solicitação em `COMPLEMENTO`, `/requerimentos` lista os quatro documentos e libera a substituição **só do que precisa mudar** — o que a CAPE já validou aparece como "validado · mantém". A exceção é a devolução no check-list (`devolvidaNoChecklist`), onde o projeto em si muda e qualquer prancha pode ser reenviada. A regra vale no servidor, não só na tela: `uploadDocumentoAction` aceita `RASCUNHO` e `COMPLEMENTO` e, neste, recusa documento já validado. Depois das trocas, "Enviar complementação" devolve a solicitação à CAPE.
- Na tela de análise, "Devolver para complementação" fica indisponível enquanto a solicitação está em `COMPLEMENTO` — a action já era no-op nesse estado, e o botão passa a mostrar "Aguardando reenvio".
- **Reanálise parcial**: ao devolver uma solicitação (documentos ou check-list reprovado), os itens já aprovados ficam travados (`travado=true`) e só os reprovados reabrem para o próximo ciclo — implementado em `emitirParecerAction`/`devolverDocumentacaoAction` (`src/lib/actions/analise-actions.ts`).
- **Reenvios e taxa**: conta apenas o ciclo da **análise técnica (check-list)** — devolução na validação documental é acerto de forma e não consome tentativa. `Solicitacao.devolvidaNoChecklist` registra de qual fase veio a devolução, e o contador sobe em `reenviarComplementacaoAction`, quando a documentação nova chega (não na devolução, senão cada clique do analista em "Devolver para complementação" consumiria uma tentativa). Ao ultrapassar `reenviosSemTaxa` do empreendimento, a taxa é marcada como não paga novamente. Devolver uma solicitação que já está em `COMPLEMENTO` não faz nada.
- **Vínculo lote↔usuário**: proprietário/RT se cadastram sozinhos e já acessam a plataforma (podem abrir uma nova solicitação); o vínculo com o lote fica pendente até um analista CAPE aprovar/recusar em **Vínculos a validar** (`/vinculos`), tela própria no menu da equipe CAPE que reúne os pedidos de todos os empreendimentos — uma linha por pedido, no formato da fila de análise (empreendimento, quadra/lote, solicitante), que se expande ao clique com todos os dados informados, a comprovação e os botões de aprovar e reprovar. O contador no menu mostra quantos aguardam. A tela Empreendimentos só avisa quantos pedidos são daquele empreendimento e aponta para lá. O **proprietário** comprova por texto (matrícula do lote ou código de convite, em `vinculoComprovacao`); o **RT anexa a autorização assinada pelo proprietário** (PDF, Word ou imagem, até 10 MB, guardada no Vercel Blob e servida por `/api/vinculo-autorizacao/[userId]`, aberta só para a equipe CAPE e para o próprio autor do envio).
- **Alvará de execução**: aprovado o projeto, o proprietário/RT **anexa** o alvará da Prefeitura em `/requerimentos` (PDF, até 5 MB) e a solicitação vai para `ALVARA_CONFERENCIA`. Quem libera o início da obra é a CAPE, na tela de análise: "Aceitar e liberar início da obra" leva a `EXECUCAO`; recusar devolve ao status anterior (`statusAntesAlvara`, para não achatar `APROVADA` e `RESSALVAS`), guarda o motivo em `alvaraRecusa` e o proprietário vê a recusa junto do botão de enviar outro. O arquivo é servido por `/api/alvara/[solicitacaoId]`. Antes disso, o clique do proprietário colocava a obra em execução sozinho, sem conferência.
- **Mapa do loteamento**: pins posicionados por `posX`/`posY` (%) sobre a planta, coloridos pelo status da solicitação mais recente do lote; clique abre o histórico completo do lote.

## Limitações conhecidas / próximos passos

- **Sem envio de e-mail real.** Não há provedor de e-mail configurado. Confirmação de cadastro, convites de usuário interno (a senha temporária é mostrada uma vez na tela) e notificações de status não são enviados por e-mail — apenas persistidos no banco.
- **"Aprovado com ressalvas" e "Reprovado" definitivo** existem como status e aparecem nos dados de exemplo, mas a única transição implementada pela tela de análise é aprovar (sem reprovas) ou devolver para complementação — reprovação definitiva e ressalvas ficariam a critério de uma extensão futura da tela de análise.
- **CPF/telefone/data de nascimento não são validados com máscara ou dígito verificador**, apenas presença mínima.
- **Vínculo de proprietário/RT ao lote ainda depende do fluxo de autocadastro.** A tela de cadastro de lotes não atribui proprietário/RT na criação — isso continua acontecendo só quando a pessoa se cadastra em `/login` e a CAPE aprova o vínculo em Empreendimentos.

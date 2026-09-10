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

Login por e-mail **ou** CPF. Novas contas de proprietário/RT são criadas por auto-cadastro em `/login`; contas de analista CAPE/síndico são criadas na tela **Usuários** por um analista já logado.

## Telas

`/login` (cadastro + login) · `/resumo` · `/fila` · `/analise/[protocolo]` · `/requerimentos` · `/nova` (wizard de 3 passos) · `/empreendimentos` · `/checklists` · `/usuarios` — visibilidade e navegação por papel definidas em `src/lib/nav.ts`.

## Multi-cliente (múltiplos empreendimentos)

A plataforma atende vários empreendimentos (condomínios/loteamentos) ao mesmo tempo:

- **Admin CAPE** (`ADMIN_CAPE`) cadastra novos empreendimentos pela tela **Empreendimentos** e cria outras contas internas (analistas, síndicos e outros admins). Tem acesso total, igual ao Analista CAPE.
- **Analista CAPE** (`CAPE_ANALISTA`) enxerga todos os empreendimentos, mas não cria novos — só edita configuração, planta e check-list dos existentes.
- As telas **Resumo**, **Check-lists** e **Empreendimentos** têm um seletor de empreendimento no topo quando há mais de um cadastrado; a **Fila de análise** reúne as solicitações de todos os empreendimentos, com filtro opcional para restringir a um deles.
- **Síndico**: cada empreendimento tem um síndico vinculado (`Empreendimento.sindicoId`); o síndico só enxerga o(s) empreendimento(s) aos quais está vinculado.
- **Proprietário / Responsável técnico**: o vínculo é por lote (`Lote.proprietarioId`/`Lote.rtId`), e o lote pertence a um empreendimento — o auto-cadastro em `/login` já pede para escolher o empreendimento, a quadra e o lote.

Cadastro de quadras e lotes de um novo empreendimento ainda não tem tela própria — hoje só é feito via `prisma/seed.ts` ou diretamente no banco (mesma limitação que já existia para o empreendimento único).

## Lógica de negócio implementada

- **Validação documental → check-list**: o check-list técnico só libera depois que os 5 documentos são marcados como validados pelo analista.
- **Reanálise parcial**: ao devolver uma solicitação (documentos ou check-list reprovado), os itens já aprovados ficam travados (`travado=true`) e só os reprovados reabrem para o próximo ciclo — implementado em `emitirParecerAction`/`devolverDocumentacaoAction` (`src/lib/actions/analise-actions.ts`).
- **Reenvios e taxa**: contador de reenvios por solicitação; ao ultrapassar `reenviosSemTaxa` do empreendimento, a taxa é marcada como não paga novamente.
- **Vínculo lote↔usuário**: proprietário/RT se cadastram sozinhos e já acessam a plataforma (podem abrir uma nova solicitação); o vínculo com o lote fica pendente até um analista CAPE aprovar/recusar em **Usuários**.
- **Mapa do loteamento**: pins posicionados por `posX`/`posY` (%) sobre a planta, coloridos pelo status da solicitação mais recente do lote; clique abre o histórico completo do lote.

## Limitações conhecidas / próximos passos

- **Sem envio de e-mail real.** Não há provedor de e-mail configurado. Confirmação de cadastro, convites de usuário interno (a senha temporária é mostrada uma vez na tela) e notificações de status não são enviados por e-mail — apenas persistidos no banco.
- **"Aprovado com ressalvas" e "Reprovado" definitivo** existem como status e aparecem nos dados de exemplo, mas a única transição implementada pela tela de análise é aprovar (sem reprovas) ou devolver para complementação — reprovação definitiva e ressalvas ficariam a critério de uma extensão futura da tela de análise.
- **CPF/telefone/data de nascimento não são validados com máscara ou dígito verificador**, apenas presença mínima.
- **Sem tela de cadastro de quadras/lotes.** Um novo empreendimento é criado com os dados básicos (nome, cidade, taxa, prazo); quadras e lotes ainda precisam ser inseridos via seed/banco.

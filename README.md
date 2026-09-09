# CAPE Aprova

Plataforma web para receber, analisar, aprovar ou reprovar solicitações de obras em lotes de condomínios horizontais administrados pela CAPE Engenharia.

Implementação real (Next.js + banco de dados + autenticação + upload de arquivos) a partir do protótipo de design em `AprovaCAPE.dc.html` (Claude Design) e do briefing nos chats do handoff.

## Stack

- **Next.js 16** (App Router, Turbopack, React 19) + TypeScript
- **Prisma 7** + **Postgres** (Neon, via `@prisma/adapter-pg`) — `DATABASE_URL` configurado como variável de ambiente (local em `.env`/`.env.local`, em produção via integração Neon da Vercel)
- **Auth.js (NextAuth v5)** com provider de credenciais (e-mail/CPF + senha, sessão JWT) — requer `AUTH_SECRET`
- Upload de arquivos no **Vercel Blob** (store privado): documentos de solicitação servidos por `/api/files/[docId]`, plantas enviadas pelo analista servidas por `/api/plantas/[...path]` — ambos com checagem de sessão. A planta de demonstração (`quinta-da-primavera.webp`) continua estática em `public/plantas/`.

## Deploy (Vercel)

Projeto vinculado em `mfabianmarini-arts-projects/aprovacape`, com GitHub conectado (`mfabianmarini-art/aprovacape`, branch `main`) para deploy automático a cada push. Recursos provisionados: Postgres (Neon, integração de marketplace) e um Blob store privado (`aprovacape-uploads`) — variáveis `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` e `AUTH_SECRET` já configuradas em Production/Preview/Development no painel da Vercel.

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
| Analista CAPE | `denise@cape.eng.br` |
| Síndico (somente leitura) | `sindico@quintadaprimavera.com.br` |
| Proprietário | `marcos.prado@gmail.com` |
| Responsável técnico | `ana.beltrao@estudio.arq.br` |

Login por e-mail **ou** CPF. Novas contas de proprietário/RT são criadas por auto-cadastro em `/login`; contas de analista CAPE/síndico são criadas na tela **Usuários** por um analista já logado.

## Telas

`/login` (cadastro + login) · `/resumo` · `/fila` · `/analise/[protocolo]` · `/requerimentos` · `/nova` (wizard de 3 passos) · `/empreendimentos` · `/checklists` · `/usuarios` — visibilidade e navegação por papel definidas em `src/lib/nav.ts`.

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

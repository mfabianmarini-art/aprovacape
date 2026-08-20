# CAPE Aprova

Plataforma web para receber, analisar, aprovar ou reprovar solicitações de obras em lotes de condomínios horizontais administrados pela CAPE Engenharia.

Implementação real (Next.js + banco de dados + autenticação + upload de arquivos) a partir do protótipo de design em `AprovaCAPE.dc.html` (Claude Design) e do briefing nos chats do handoff.

## Stack

- **Next.js 16** (App Router, Turbopack, React 19) + TypeScript
- **Prisma 7** + SQLite (driver adapter `@prisma/adapter-better-sqlite3`) — troque para Postgres/MySQL em produção multi-instância trocando o `provider` no schema e o adapter em `src/lib/prisma.ts`
- **Auth.js (NextAuth v5)** com provider de credenciais (e-mail/CPF + senha, sessão JWT)
- Upload de arquivos em disco local: documentos de solicitação em `uploads/` (privado, servido só por `/api/files/[docId]` com checagem de sessão), plantas de loteamento em `public/plantas/`

## Rodando localmente

```bash
npm install          # também roda `prisma generate` via postinstall
npm run db:migrate    # cria/atualiza o banco (prisma/dev.db)
npm run db:seed       # popula com o cenário do protótipo (Quinta da Primavera)
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
- **Upload em disco local.** Adequado para uma única instância; para múltiplas instâncias/serverless, trocar `src/lib/upload.ts` e o upload de planta em `empreendimento-actions.ts` por um provedor de object storage (S3-compatível, Vercel Blob etc.).
- **SQLite.** Escolhido pela simplicidade de rodar sem infraestrutura externa. Para produção com múltiplos usuários simultâneos, migrar para Postgres é recomendado (schema já é portável).
- **"Aprovado com ressalvas" e "Reprovado" definitivo** existem como status e aparecem nos dados de exemplo, mas a única transição implementada pela tela de análise é aprovar (sem reprovas) ou devolver para complementação — reprovação definitiva e ressalvas ficariam a critério de uma extensão futura da tela de análise.
- **CPF/telefone/data de nascimento não são validados com máscara ou dígito verificador**, apenas presença mínima.

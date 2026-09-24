# Meeting

Aplicação web para planejar e acompanhar a semana de uma congregação: programa das reuniões, designações de sala, limpeza, conteúdo importado e o que cada membro precisa saber — no celular, mesmo sem conexão.

Interface em espanhol. O repositório não contém dados reais de congregação, membros ou credenciais: tudo isso vive no banco e no `.env` local de cada ambiente.

## O problema que resolve

Uma congregação gerencia, toda semana, um conjunto fixo de operações:

- qual é o **programa** das duas reuniões (partes, discursos, cânticos, exceções);
- **quem** cuida de cada tarefa na sala (microfone, mesa de som, palco, plateia) e de cada turno de **limpeza**;
- de **quem** é a vez, olhando no celular, sem rede, antes de sair de casa;
- do **conteúdo** da reunião (publicações, cadernos, discursos de oradores de fora).

Antes, isso vivia em planilhas, impressos e mensagens soltas. O Meeting centraliza tudo em um só lugar, com visões diferentes para quem administra e para quem só precisa ver o próprio turno.

## O que o app faz

| Área | Rotas | O que faz |
| --- | --- | --- |
| **Início / Minha semana** | `/` | Landing pública com login; com sessão, mostra a semana atual: minhas partes, minha limpeza e os cartões das próximas reuniões. |
| **Reuniões** | `/reunioes` | Programa completo das reuniões entre semana e de fim de semana: partes, discursos, cânticos, rascunho da encenação, salvar/replicar programa. Abas **Contenido** (importar `.jwpub` de publicações e cadernos, outlines, músicas) e **Oradores** (oradores de fora e seus discursos). |
| **Designações** | `/designacoes` | Visão do membro: próximas reuniões com cargos e limpeza do dia, incluindo "minha semana". |
| **Asignar** | `/asignar` | Painel admin: sortear/ajustar designações da reunião e o programa de limpeza. |
| **Pessoas** | `/personas` | Cadastro e busca de membros, papéis e elegibilidade; formulários de criação/edição. |
| **Configuración** | `/configuracion` | Dono da conta: horários e nome da congregação, exceções de agenda, eventos especiais, regras de limpeza e de designações. |
| **Impressão e agenda** | `/reunioes/imprimir`, `/api/reunioes/ical` | Versão imprimível do programa e feed iCal das reuniões. |

Recursos transversais:

- **PDFs** — listas de cargos e programa de limpeza exportáveis.
- **Offline (PWA)** — service worker (Serwist), cache IndexedDB da semana e página `~offline`; o programa continua legível sem rede.
- **Login com Google** — `better-auth`, papéis `owner` / `admin` / membro; cada rota exige a permissão certa no server.
- **Impressão pensada** — folha A4 de baixa tinta, sem cor desnecessária.

## Stack

| Camada | Escolha |
| --- | --- |
| Framework | Next.js 16 (App Router, RSC) · React 19 · TypeScript |
| UI | Tailwind CSS v4 · componentes próprios sobre Radix UI · tokens em `DESIGN.md` |
| Dados | Drizzle ORM · PostgreSQL (Neon, driver serverless) · Zod |
| Cliente/server | Server Components + Server Actions; TanStack Query só no cliente |
| Auth | `better-auth` (Google) |
| PWA | Serwist + IndexedDB (`idb`) |
| Qualidade | Biome (lint/format) · Vitest · `tsc --noEmit` · Husky + lint-staged |

## Arquitetura

O código é fatiado por **feature**, não por tipo de arquivo:

```
src/
├── app/                    # rotas: páginas server-first + API (auth, iCal)
│   ├── page.tsx            # landing / minha semana
│   └── (protected)/…       # reunioes, designacoes, asignar, personas, configuracion
├── features/
│   ├── meetings/           # programa da reunião (domínio, queries, UI)
│   ├── meeting-duties/     # cargos da sala + PDF
│   ├── cleaning/           # programa de limpeza + "minha limpeza"
│   ├── meeting-content/    # importação .jwpub, outlines, músicas
│   ├── people/             # cadastro de membros
│   ├── designations/       # regras/config de designações
│   ├── weekly-schedule/    # semana corrente, exceções, minha semana
│   ├── settings/           # horários e configurações da congregação
│   ├── assignments/        # schema de atribuições
│   ├── auth/               # sessão e guards
│   └── offline/            # cache da semana, indicador online
└── shared/                 # ui, i18n (es), skeletons, utilidades
```

Cada feature segue as mesmas camadas: `domain/` (regras puras, testadas) → `application/` (Server Actions e queries Drizzle) → `infrastructure/` (schema) → `presentation/` (UI).

**Padrão de renderização** (obrigatório, ver `AGENTS.md`):

1. `page.tsx` é sempre Server Component: autentica, busca com `Promise.all` e monta o shell.
2. Interatividade mora só em ilhas `"use client"` pequenas, com props serializáveis.
3. Conteúdo assíncrono pesado fica dentro de `<Suspense>` com skeleton — o header nunca espera dados.
4. Segurança no server: Drizzle, `better-auth` e actions não vazam para o client; o client recebe apenas flags (`canManage`, `currentUserId`).
5. Zero supressão de lint (`biome-ignore` / `eslint-disable`) — corrige-se a causa raiz.

## Rodando local

Requisitos: Node 20+ e um banco PostgreSQL (ex.: Neon).

```bash
npm install
# crie o .env.local com as variáveis de ambiente do seu ambiente
# (conexao do banco e credenciais do provedor de login) — nunca versionado
npm run db:push        # aplica o schema Drizzle
npm run dev            # http://localhost:3000
```

### Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção (webpack) |
| `npm run start` | serve o build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` / `lint:fix` | Biome + ESLint em `src/`, `test/` e `vitest.config.ts` |
| `npm test` / `test:unit` | Vitest: 480 testes (banco mockado, sem rede) |
| `npm run test:watch` | Vitest em modo watch |
| `npm run test:coverage` | Vitest + relatório de cobertura (pasta `coverage/`, ignorada no git) |
| `npm run db:generate` | gera migrations a partir do schema |
| `npm run db:push` | aplica o schema direto no banco |

## Convenções

- **Idioma da UI:** espanhol (rótulos em `src/shared/i18n/es.ts` ou inline).
- **Design system:** tokens e regras em [`DESIGN.md`](DESIGN.md); azul só para ação/seleção/foco; sem `uppercase`; alvos de toque ≥ 44px; contraste AA.
- **Estado no cliente:** sempre TanStack Query — nunca `fetch` em `useEffect`.
- **Commit:** hook Husky roda `biome check --write` nos arquivos stageados.

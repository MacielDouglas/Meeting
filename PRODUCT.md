# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Organizadores (roles `owner` / `admin`, ex.: anciãos e servos ministeriais): montam programa semanal, designações por privilégios, rodízio de limpeza, horários, eventos especiais, exceções e oradores de fora.
- Publicadores (role `member` + visitantes deslogados): consultam a semana atual, suas designações em "Minha Semana" e o programa público, inclusive offline.

## Product Purpose

App "Reuniones" — programa semanal de reuniões das Testemunhas de Jeová (reunião entre semana + fim de semana). Existe para substituir planilhas e papéis: centralizar conteúdo real da reunião, designar pessoas por elegibilidade e manter rodízio justo de limpeza, com consulta rápida no celular e funcionamento offline.

Sucesso = organizador publica a semana sem retrabalho e publicador encontra em segundos quando e onde serve.

## Positioning

Une em um só lugar o que hoje vive separado: conteúdo oficial importado via `.jwpub` (apostilas mwb, A Sentinela w, sjj, S-34, cânticos e esboços), designações por privilégios/elegibilidade (oração, som, vídeo, plataforma, microfone, presidência, discursos, leitura, acomodação etc.) e rodízio automático de limpeza com fairness global, mais PWA offline mobile-first com cache da semana.

## Operating Context

- Rotina semanal congregacional: semana `weekStart–weekEnd`, dias/horas configuráveis de meio de semana e fim de semana (`MeetingScheduleForm`).
- Eventos especiais que alteram a rotina: assembleia regional, visita de viajante/representante (semana pulada), memorial (mantém limpeza) e `no_meeting` (pula o dia).
- Exceções de agenda e oradores de fora (`OutsideSpeakers`).
- Uso em campo com conexão instável: PWA com Serwist + IndexedDB (`ScheduleCacheWriter`, `OnlineStatus`, rota `~offline`), shell mobile-first com bottom nav.
- Idioma da UI: espanhol (`src/shared/i18n/es.ts`); conteúdo em ES/PT/EN.

## Capabilities and Constraints

Confirmado no código:

- Agenda semanal: `getWeeklySchedule`, `getMyWeek`, `WeekView`, `MyWeekSection`, impressão em `/reunioes/imprimir`.
- Programa de reuniões: músicas, esboços, artigos A Sentinela e semanas da apostila por aba (`MeetingProgramSection`, abas Reuniões/Designações/Conteúdo/Oradores).
- Designações com elegibilidade por sexo, idade (jovem), batismo, privilégios e indisponibilidade; gestão de pessoas e usuários vinculados (`/personas`, `/configuracion?tab=designacoes`).
- Limpeza: setores configuráveis, algoritmo em 8 passadas com fairness de 90 dias (inclui drafts futuros), descanso por sessão e semanal, família atômica, bloqueio de jovem em setor adulto exceto fallback com aviso — ver `docs/cleaning-algorithm.md` e `assign-cleaning.ts`.
- Conteúdo: importação e consulta de `.jwpub` (`jwpub/*.jwpub`: `mwb_S_202607`, `w_S_202606`, `sjj_S`, `S-34_S`), contagens por idioma.
- Config: horários, nome da congregação (cabeçalho do programa e do PDF), eventos especiais, exceções, setores de limpeza e regras de designação — restrito a `owner` em `/configuracion`.
- Auth: `better-auth` com Google; sessão server-side (`getCurrentUser`); `canManage`/`isOwner`/`currentUserId` no client, nunca objeto `user` completo.
- Padrão técnico obrigatório (`AGENTS.md`): páginas server async + `Promise.all`, interatividade só em ilhas `"use client"`, `<Suspense>` por aba com skeletons, TanStack Query no client, zero supressão de lint.

Indeciso: metas de adoção, padrão formal de acessibilidade (WCAG), política de impressão/exportação além da página atual.

## Brand Commitments

- Nome: "Reuniones"; descrição: "Programa semanal de reuniones".
- Voz e idioma vinculantes: espanhol da UI em `src/shared/i18n/es.ts`.
- Compromisso de verdade: só conteúdo real importado; sem depoimentos, estatísticas ou estudos de caso inventados.
- Ativos existentes: `public/icons/`, `favicon.ico`, `manifest.ts`, `.jwpub` em `jwpub/`, algoritmo documentado em `docs/cleaning-algorithm.md`.
- Mundo visual (decisão do usuário, seed 48f97b0b): linguagem inspirada no Nike Run Club, sensação de app mobile nativo — preto volt no escuro, papel tinta no claro, acento volt elétrico, display condensado esportivo, energia atlética sem gamificação. Cores das seções TheocBase e layout de impressão preservados como verdade de domínio.

Sem direção estética vinculante registrada nesta fase — mundo visual fica para new-work/document.

## Evidence on Hand

- Código executável: `src/app/page.tsx` (home com semana atual), `src/app/reunioes/page.tsx`, `src/app/personas/`, `src/app/configuracion/page.tsx`, `src/features/{meetings,designations,cleaning,meeting-content,people,weekly-schedule,offline,settings,auth}/`.
- Conteúdo real: `jwpub/mwb_S_202607.jwpub`, `jwpub/w_S_202606.jwpub`, `jwpub/sjj_S.jwpub`, `jwpub/S-34_S.jwpub`, `jwpub/syncfile.json`.
- Regras: `docs/cleaning-algorithm.md`, testes `assign-cleaning.test.ts`, `build-meeting-program.test.ts`, `capabilities.test.ts`, `schedule.test.ts`, `my-week.test.ts`.
- Ausências que não devem ser fabricadas: depoimentos, clientes, benchmarks, preços, licenças.

## Product Principles

1. Verdade do programa acima de enfeite: data, conteúdo e designado corretos valem mais que qualquer efeito.
2. Justiça visível no rodízio: ninguém sobrecarregado, regras de elegibilidade e fallbacks sempre explicados com aviso.
3. Offline primeiro: a semana salva precisa abrir sem rede.
4. Responsabilidade por papel: só owner/admin altera programa e config; membro consulta.
5. Conteúdo real, nunca inventado: sem `.jwpub` ou designação confirmada, mostrar estado vazio honesto.

## Accessibility & Inclusion

- Mobile-first com safe-area e navegação inferior; uso com uma mão no salão e em campo.
- Espanhol como idioma principal; conteúdo multilíngue ES/PT/EN preservado.
- Offline como necessidade de inclusão para conexões instáveis.
- Padrão WCAG formal: não estabelecido (indeciso).

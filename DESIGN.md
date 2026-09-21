---
name: Reuniones
description: Programa semanal de reuniones
colors:
  volt: "#d8ff00"
  tinta: "#111113"
  papel: "#ffffff"
  pista: "#0a0a0b"
  superficie: "#141417"
  papel-suave: "#f3f3f1"
  tinta-suave: "#17171a"
  texto-secundario: "#63636b"
  linha: "#e5e5e1"
  acento: "#0b6bcb"
  tinta-acento: "#ffffff"
  exito: "#12805c"
  exito-suave: "#def5e9"
  alerta: "#9a6200"
  alerta-suave: "#fdeecd"
  perigo: "#d92d20"
  perigo-suave: "#fde4e2"
  tinta-perigo: "#ffffff"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.02em"
  body:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.acento}"
    textColor: "{colors.tinta-acento}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.papel-suave}"
    textColor: "{colors.tinta-suave}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-outline:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  card-sessao:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.lg}"
    padding: "16px"
  badge-periodo:
    backgroundColor: "{colors.papel-suave}"
    textColor: "{colors.tinta-suave}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  aba-ativa:
    backgroundColor: "{colors.acento}"
    textColor: "{colors.tinta-acento}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "36px"
  input-field:
    backgroundColor: "{colors.papel-suave}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.sm}"
    height: "44px"
---

# Design System: Reuniones

## Overview

**Creative North Star: "Semana de Treino"**

A semana de reuniões programada como uma semana de treino: cada reunião é uma sessão com hora, elenco e partes, legível de relance como um plano de corrida. Títulos condensados em caixa alta marcam o ritmo; o volt elétrico marca só o que está ativo, selecionado ou em foco. Energia atlética nos números e nos cabeçalhos, hospitalidade nos textos — sem gamificação, sem competição, sem hype.

Densidade confortável para operar com uma mão: shell estreito centrado, cartões de sessão, abas em pílula com uma única gramática e esqueletos honestos por seção. A verdade do programa continua intocável — data, conteúdo e designado primeiro.

**Key Characteristics:**
- Atlético e legível, nunca administrativo e frio.
- Display condensado em caixa alta; corpo direto e hospitaleiro.
- Volt como sinal, nunca como decoração.
- Mobile-first com sensação nativa, expansível para tablet e desktop.

## Colors

Preto pista e volt no escuro; papel e tinta no claro. Um único acento funcional que troca de material por tema.

### Primary
- **Volt** (#d8ff00): o sinal. No escuro é o acento total (abas ativas, primárias, marca, foco); no claro aparece contido nos mesmos pontos funcionais.
- **Acento** (claro #0b6bcb / escuro volt #d8ff00): forma tokenizada do volt legível nos dois temas. Texto sobre acento usa tinta de acento (claro #ffffff / escuro #0a0a0b).
- **Tinta** (#111113) / **Papel** (#ffffff): voz neutra do tema claro.
- **Pista** (#0a0a0b) / **Superfície** (#141417): fundo e cartão do tema escuro.

### Neutral
- **Papel Suave** (#f3f3f1): superfícies secundárias, campos, esqueletos e abas inativas no claro (no escuro, #1c1c20).
- **Texto Secundário** (claro #63636b / escuro #a3a3ab): descrições, metadados e estados vazios.
- **Linha** (claro #e5e5e1 / escuro #26262b): bordas, divisórias e borda de inputs.

### Tertiary
- **Êxito** (claro #12805c / escuro #3ddc97) e **Êxito Suave**: confirmações e programas confirmados.
- **Alerta** (claro #9a6200 / escuro #ffb224) e **Alerta Suave**: avisos de sorteio e observações.
- **Perigo** (claro #d92d20 / escuro #f97066), **Perigo Suave** e **Tinta Perigo**: erros e ações destrutivas.

### Cores de domínio (sancionadas, não são drift)
- **Seções TheocBase**: faixas do programa com identidade própria — Tesouros #656164, Maestros #c78909, Vida Cristã #99131e, Discurso Público #2f4868, Atalaya #4d654d. Preservadas como verdade de domínio.
- **Sexo**: rosa (`text-rose-500`) e céu (`text-sky-500`) nos avatares da lista — convenção de domínio, fora do sistema.

### Named Rules
**The Volt com Moderação Rule.** O volt aparece em ≤10% de qualquer tela, somente em ativo, selecionado ou foco. Sua raridade é o ponto.
**The Papel Primeiro Rule.** Fundos são papel/pista ou superfícies suaves; tinta e volt carregam texto e ação, nunca grandes áreas decorativas.

## Typography

**Display Font:** Barlow Condensed 500/600/700 (via next/font, variável `--font-barlow-condensed`), com Arial Narrow de fallback
**Body Font:** Geist (com Arial, Helvetica, sans-serif de fallback)
**Label/Mono Font:** Barlow Condensed para micro-rótulos atléticos; Geist Mono para valores tabulares quando necessário.

**Character:** Condensado esportivo em caixa alta para tudo que marca ritmo (títulos, numerais de sessão, pílulas, navegação); corpo pequeno e direto para operar.

### Hierarchy
- **Display** (600, 2.25rem / text-4xl, 1.0, caixa alta, tracking 0.02em): título da página, um por tela (`PageHeader`).
- **Headline** (600, 1.5rem / text-2xl, 1.0, caixa alta): título de cartão de sessão e de diálogo.
- **Body** (400, 0.875rem / text-sm, 1.5): descrições, metadados, texto de diálogo.
- **Label** (500, 0.75rem / text-xs, caixa alta, tracking 0.08em): badges, abas, navegação inferior, micro-rótulos e metas de seção.

### Named Rules
**The Um Display Rule.** Um único display por tela; todo o resto desce para headline, body ou label.
**The Caixa Alta com patente Rule.** Caixa alta é reservada ao display e aos rótulos atléticos; corpo e descrições nunca gritam.

## Layout

Modelo de coluna única centrada com ritmo de 8/12/16. Shell `.app-shell` com largura máxima 28rem no celular, 42rem em sm (640px) e 56rem em lg (1024px); respiro lateral de 1rem mais safe-area; distância inferior de 5rem para a navegação fixa.

Todas as telas abrem com `PageHeader` (título display + descrição + meta atlética + ações) e empilham seção ativa com `Suspense` próprio — o shell nunca espera dados. Listas usam divisórias de 1px ou blocos em papel suave; cartões de sessão respiram com padding de 16px e gap de 12–16px.

## Elevation & Depth

Atlético e plano: camadas tonais carregam a hierarquia, sombra marca elevação real. Cartões em repouso mínimo (`shadow-sm`); diálogo modal em sombra alta com overlay escuro; marca 3D do header com sombras em camadas (offset + blur + highlights inset, nunca halo colorido sem offset, nunca bloco duro sem blur).

### Named Rules
**The Sombra É Estado Rule.** Superfícies em repouso são planas ou tonais; sombra entra como resposta a elevação, hover ou foco.

## Shapes

Ações são pílulas, superfícies são cartões. Botões, abas, chips e pílulas de navegação em pílula total (999px); cartões e diálogos em 16px; inputs em 8px. Bordas de 1px na cor de linha; sem clipes decorativos.

## Components

### Buttons
Pílulas atléticas em caixa alta condensada, com resposta física ao toque.
- **Shape:** pílula total (999px), altura 44px (36px no sm, 48px no lg).
- **Primary:** acento sobre tinta de acento (volt com preto no escuro).
- **Hover / Focus:** transição de cor, `active:scale-[0.98]`, foco visível com outline duplo deslocado.
- **Secondary / Ghost / Tertiary:** secundário em papel suave; outline com borda de linha; ghost só texto.

### Chips
- **Style:** badge em pílula total, texto extra-pequeno condensado em caixa alta.
- **State:** default em acento; secundária em papel suave; outline com borda de linha.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** papel/pista com borda de linha; cartão de sessão do programa em preto com texto branco nos dois temas.
- **Shadow Strategy:** repouso mínimo (ver Elevation & Depth).
- **Internal Padding:** 16px.
- **Assinatura:** cartão de sessão — título display em caixa alta, badge de período, numeral de hora em destaque, linhas de data/local, faixas TheocBase preservadas.

### Inputs / Fields
- **Style:** campo de 44px em papel suave, cantos de 8px, borda transparente, rótulo à esquerda e valor à direita.
- **Focus:** borda migra para o acento; sem brilho decorativo.
- **Error / Disabled:** caixa em perigo suave com borda de perigo; desabilitado com opacidade reduzida.

### Navigation
Abas em pílula com uma única gramática (ativa em acento com texto em tinta de acento, inativa em papel suave); seletores de opção no mesmo idioma. Navegação inferior fixa com pílula de acento no item ativo, ícones de 20px e rótulo condensado em caixa alta, com safe-area respeitada. Menu mobile do header em painel de cartão com links condensados.

### Dialog
Confirmação centrada em 16px com sombra alta; ação destrutiva em perigo sólido com tinta de perigo, cancelamento em outline; animações de fade e zoom sutis.

### Calendar
Estados semafóricos tokenizados: selecionado em acento, programa existente em êxito suave, assembleia em perigo suave, reunião em acento translúcido, com dots na mesma gramática.

## Do's and Don'ts

### Do:
- **Do** abrir toda tela com `PageHeader`: um display, meta atlética, ações à direita.
- **Do** reservar o volt/acento para ativo, selecionado e foco.
- **Do** usar uma única gramática de pílulas para abas, filtros e ordenações.
- **Do** tokenizar todo estado (êxito, alerta, perigo + suaves); nada de literais fora do sistema.
- **Do** responder ao toque com `active:scale-[0.98]` em botões e ações.
- **Do** preservar faixas TheocBase, layout de impressão e conteúdo real como verdade de domínio.

### Don't:
- **Don't** usar gradientes de texto, brilhos coloridos ou sombras coloridas.
- **Don't** pintar grandes superfícies de volt — o fundo é papel/pista.
- **Don't** criar cores de acento fora do volt/acento e dos semáforos.
- **Don't** misturar gramáticas de aba (pílula é a única; segmentada foi aposentada).
- **Don't** bloquear o shell esperando dados; cada seção tem seu `Suspense` e fallback.
- **Don't** gamificar: sem pontos, competição ou hype — energia atlética, não jogo.
- **Don't** inventar conteúdo de programa, depoimentos ou estatísticas.

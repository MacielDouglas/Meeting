---
name: Meeting
description: Programa semanal de reuniones
colors:
  fondo: "#ffffff"
  tinta: "#111113"
  pista: "#0a0a0b"
  superficie: "#141417"
  papel-suave: "#f3f3f1"
  tinta-suave: "#17171a"
  texto-secundario: "#63636b"
  linha: "#e5e5e1"
  acento: "#1c69d4"
  tinta-acento: "#ffffff"
  acento-escuro: "#7aa7f8"
  tinta-acento-escuro: "#0a0a0b"
  exito: "#12805c"
  exito-suave: "#def5e9"
  alerta: "#9a6200"
  alerta-suave: "#fdeecd"
  perigo: "#d92d20"
  perigo-suave: "#fde4e2"
  tinta-perigo: "#ffffff"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "8px"
  md: "12px"
  lg: "14px"
  xl: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.acento}"
    textColor: "{colors.tinta-acento}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.papel-suave}"
    textColor: "{colors.tinta-suave}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "44px"
  button-outline:
    backgroundColor: "{colors.fondo}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "44px"
  card-sessao:
    backgroundColor: "{colors.fondo}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.xl}"
    padding: "16px"
  badge-estado:
    backgroundColor: "{colors.acento}"
    textColor: "{colors.tinta-acento}"
    rounded: "{rounded.sm}"
    padding: "2px 10px"
  controle-segmentado:
    backgroundColor: "{colors.papel-suave}"
    rounded: "{rounded.md}"
    padding: "4px"
    height: "40px"
  input-field:
    backgroundColor: "{colors.papel-suave}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.sm}"
    height: "44px"
---

# Design System: Meeting

## Overview

**Creative North Star: "Status do veículo"**

A semana de reuniões tratada como o painel de status de um veículo premium: cada reunião é um cartão de status com hora, elenco e partes, legível com calma e precisão. Títulos em sans nativa sem caixa alta marcam presença sem gritar; o azul funcional marca só ação, seleção e foco. Hospitalidade contida nos textos, precisão alemã nos números — sem gamificação, sem competição, sem hype.

Densidade confortável para operar com uma mão: shell estreito centrado, cartões de sessão, controle segmentado único e esqueletos honestos por seção. A verdade do programa continua intocável — data, conteúdo e designado primeiro.

**Key Characteristics:**
- Premium e contido, nunca administrativo e frio, nunca esportivo e alto.
- Sans nativa em caixa normal; corpo direto e hospitaleiro.
- Azul como função, nunca como decoração.
- Mobile-first com sensação nativa, expansível para tablet e desktop.

## Colors

Branco e tinta no claro; preto profundo no escuro. Um único azul funcional, com tinta legível por tema.

### Primary
- **Acento** (claro #1c69d4 / escuro #7aa7f8): botões, links de ação, indicadores e foco. Texto sobre acento usa tinta de acento (claro #ffffff / escuro #0a0a0b) — AA nos dois usos.
- **Fundo** (#ffffff) / **Tinta** (#111113): voz neutra do tema claro.
- **Pista** (#0a0a0b) / **Superfície** (#141417): fundo e cartão do tema escuro.

### Neutral
- **Papel Suave** (#f3f3f1): superfícies secundárias, campos, esqueletos e controles segmentados no claro (no escuro, #1c1c20).
- **Texto Secundário** (claro #63636b / escuro #a3a3ab): descrições, metadados e estados vazios.
- **Linha** (claro #e5e5e1 / escuro #26262b): bordas, divisórias e borda de inputs.

### Tertiary
- **Êxito** (claro #12805c / escuro #3ddc97) e **Êxito Suave**: confirmações e programas confirmados.
- **Alerta** (claro #9a6200 / escuro #ffb224) e **Alerta Suave**: avisos de sorteio e observações.
- **Perigo** (claro #d92d20 / escuro #f97066), **Perigo Suave** e **Tinta Perigo**: erros e ações destrutivas.

### Cores de domínio (sancionadas, não são drift)
- **Seções**: Tesoros #3c7f8b, Maestros #d68f00, Vida Cristiana #bf2f13, Discurso Público #2f4868, Atalaya #4d654d — pastilha plana na cor, rótulo na cor da seção. Rótulos em caixa normal. Preservadas como verdade de domínio.
- **Sexo**: rosa (`text-rose-500`) e céu (`text-sky-500`) nos avatares da lista — convenção de domínio, fora do sistema.

### Named Rules
**The Azul com Função Rule.** O azul aparece em ação, seleção, link e foco. Sua contenção é o ponto.
**The Neutro Primeiro Rule.** Fundos são neutros; cor carrega significado, nunca decoração.

## Typography

**Display Font:** pilha nativa do sistema (`ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto…`), sem webfont de display
**Body Font:** Geist (com Arial, Helvetica, sans-serif de fallback)
**Label/Mono Font:** pilha nativa para micro-rótulos; Geist Mono para valores tabulares quando necessário.

**Character:** Sans leve e precisa em caixa normal para tudo; corpo pequeno e direto para operar.

### Hierarchy
- **Display** (600, 1.875rem / text-3xl, 1.25, tracking -0.01em): título da página, um por tela (`PageHeader`).
- **Headline** (600, 1.25rem / text-xl, 1.3, tracking -0.01em): título de cartão de sessão e de diálogo.
- **Body** (400, 0.875rem / text-sm, 1.5): descrições, metadados, texto de diálogo.
- **Label** (500, 0.75rem / text-xs, 1.4): badges, navegação inferior, micro-rótulos e metas de seção.

### Named Rules
**The Um Display Rule.** Um único display por tela; todo o resto desce para headline, body ou label.
**The Caixa Normal Rule.** Caixa alta não existe no sistema; ênfase vem de peso e tamanho.

## Layout

Modelo de coluna única centrada com ritmo de 8/12/16. Shell `.app-shell` com largura máxima 28rem no celular, 42rem em sm (640px) e 56rem em lg (1024px); respiro lateral de 1rem mais safe-area; distância inferior de 5rem para a navegação fixa.

Todas as telas abrem com `PageHeader` (título display + descrição + meta + ações) e empilham seção ativa com `Suspense` próprio — o shell nunca espera dados. Listas usam divisórias de 1px ou blocos em papel suave; cartões de sessão respiram com padding de 16px e gap de 12–16px.

## Elevation & Depth

Premium e plano: camadas tonais carregam a hierarquia, sombra marca elevação real. Cartões em repouso mínimo (`shadow-sm`); diálogo modal em sombra alta com overlay escuro; marca do header com sombra suave única, sem relevo 3D.

### Named Rules
**The Sombra É Estado Rule.** Superfícies em repouso são planas ou tonais; sombra entra como resposta a elevação, hover ou foco.

## Shapes

Ações são retângulos precisos, superfícies são cartões. Botões e controles segmentados em 12–14px; badges e chips em 8px; cartões e diálogos em 16px; inputs em 8px. Bordas de 1px na cor de linha; sem clipes decorativos.

## Components

### Buttons
Retângulos precisos em caixa normal, quietos ao toque.
- **Shape:** cantos de 12–14px, altura 44px (36px no sm, 48px no lg).
- **Primary:** acento sobre tinta de acento.
- **Hover / Focus:** transição de cor, foco visível com outline duplo deslocado.
- **Secondary / Ghost / Tertiary:** secundário em papel suave; outline com borda de linha; ghost só texto.

### Chips
- **Style:** badge em 8px, texto extra-pequeno em caixa normal.
- **State:** default em acento; secundária em papel suave; outline com borda de linha.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** papel no claro com borda de linha, preto sessão no escuro (`--session`); seções TheocBase preservadas.
- **Shadow Strategy:** repouso mínimo (ver Elevation & Depth).
- **Internal Padding:** 16px.
- **Assinatura:** cartão de sessão — título em caixa normal, numeral de hora tabular leve, linhas de data/local, seções TheocBase preservadas.

### Inputs / Fields
- **Style:** campo de 44px em papel suave, cantos de 8px, borda transparente, rótulo à esquerda e valor à direita.
- **Focus:** borda migra para o acento; sem brilho decorativo.
- **Error / Disabled:** caixa em perigo suave com borda de perigo; desabilitado com opacidade reduzida.

### Navigation
Controle segmentado único (trilho em papel suave, opção ativa em fundo elevado com sombra; mesma gramática para abas, filtros e ordenações); sub-níveis em texto com indicador. Navegação inferior fixa por ícones com rótulo pequeno em caixa normal, item ativo em acento com fundo translúcido, ícones de 20px, com safe-area respeitada. Menu mobile do header em painel de cartão com links regulares.

### Emblema de seção
Pastilha plana na cor da seção (16px, sombra mínima, ícone branco sem relevo) + rótulo na cor da seção em caixa normal. Classe `.section-emblem` em `globals.css`.

### Dialog
Confirmação centrada em 16px com sombra alta; ação destrutiva em perigo sólido com tinta de perigo, cancelamento em outline; animações de fade e zoom sutis.

### Calendar
Estados semafóricos tokenizados: selecionado em acento, programa existente em êxito suave, assembleia em perigo suave, reunião em acento translúcido, com dots na mesma gramática.

### Impresso PDF
Documento A4 sempre claro, 2 entre semana ou 4 fim de semana por página com autofit: cabeçalho com congregação, faixa da seção em tinta clara com ícone branco real, fileira `hora | Nº título (durmin) | pessoa (papel)`, sem descrições.

## Do's and Don'ts

### Do:
- **Do** abrir toda tela com `PageHeader`: um display, meta, ações à direita.
- **Do** reservar o azul para ação, seleção, link e foco.
- **Do** usar controle segmentado único para abas, filtros e ordenações.
- **Do** tokenizar todo estado (êxito, alerta, perigo + suaves); nada de literais fora do sistema.
- **Do** preservar seções TheocBase, layout de impressão e conteúdo real como verdade de domínio.

### Don't:
- **Don't** usar gradientes de texto, brilhos coloridos ou sombras coloridas.
- **Don't** usar caixa alta — o sistema fala em caixa normal.
- **Don't** criar cores de acento fora do azul e dos semáforos.
- **Don't** misturar gramáticas de seleção (segmentado é o padrão; texto com indicador no sub-nível).
- **Don't** bloquear o shell esperando dados; cada seção tem seu `Suspense` e fallback.
- **Don't** gamificar: sem pontos, competição ou hype — precisão calma, não jogo.
- **Don't** inventar conteúdo de programa, depoimentos ou estatísticas.

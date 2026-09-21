---
name: Reuniones
description: Programa semanal de reuniones
colors:
  tinta: "#171717"
  papel: "#ffffff"
  tinta-suave: "#18181b"
  papel-suave: "#f4f4f5"
  nevoa: "#f4f4f5"
  texto-secundario: "#71717a"
  linha: "#e4e4e7"
  campo-borda: "#e4e4e7"
  azul-sinal: "#0ea5e9"
  perigo: "#ef4444"
  papel-contraste: "#fafafa"
typography:
  display:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
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
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel-contraste}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel-contraste}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.papel-suave}"
    textColor: "{colors.tinta-suave}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-outline:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-ghost:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.lg}"
    padding: "16px"
  badge-secondary:
    backgroundColor: "{colors.papel-suave}"
    textColor: "{colors.tinta-suave}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  input-field:
    backgroundColor: "{colors.papel-suave}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.sm}"
    height: "44px"
---

# Design System: Reuniones

## Overview

**Creative North Star: "O Salão Sereno"**

Um sistema acolhedor e simples para quem organiza e para quem consulta. A interface se comporta como a folha do programa sobre a mesa: ordem calma, hierarquia curta e cada designação encontrável em segundos, com uma mão, no salão ou em campo. O neutro carrega as superfícies; o azul aparece só como sinal funcional.

Densidade confortável sem empilhar ruído: shell estreito centrado, cartões por reunião, abas por seção e esqueletos honestos durante o carregamento. Nada compete com a verdade do programa — data, conteúdo e designado vêm primeiro.

**Key Characteristics:**
- Acolhedor e simples, nunca administrativo e frio.
- Neutro como voz, azul como sinal.
- Contido e tátil: cantos generosos, resposta física sutil ao toque.
- Mobile-first com uma mão, expansível para tablet e desktop.

## Colors

Neutros quentes de tinta sobre papel, com um único acento funcional azul para ativo, foco e estado.

### Primary
- **Tinta de Ata** (#171717): superfícies de ação primária (botão default, badge default) e texto principal sobre papel.
- **Azul Sinal** (#0ea5e9): único acento funcional — aba ativa, item de navegação ativo, switch ligado, anel de foco. Raro por desenho.

### Neutral
- **Papel** (#ffffff): fundo da app e dos cartões.
- **Papel Suave** (#f4f4f5): superfícies secundárias, campos, skeletons e abas inativas.
- **Texto Secundário** (#71717a): descrições, metadados e estados vazios.
- **Linha** (#e4e4e7): bordas de cartões, divisórias de lista e borda de inputs.
- **Perigo** (#ef4444): ação destrutiva de confirmação (diálogo de exclusão).

### Named Rules
**The Azul com Moderação Rule.** O Azul Sinal aparece em ≤10% de qualquer tela, somente em ativo, foco ou estado. Sua raridade é o ponto.
**The Papel Primeiro Rule.** Fundos são papel ou papel suave; tinta é para texto e ação primária, nunca para grandes superfícies decorativas.

## Typography

**Display Font:** Geist (com Arial, Helvetica, sans-serif de fallback)
**Body Font:** Geist (com Arial, Helvetica, sans-serif de fallback)
**Label/Mono Font:** Geist Mono para valores tabulares quando necessário; corpo usa a pilha sans.

**Character:** Direta e hospitaleira. Títulos curtos e densos, corpo pequeno e legível, rótulos compactos em maiúsculas só quando o componente pedir.

### Hierarchy
- **Display** (700, 1.5rem / text-2xl, 1.2, tracking apertado): título da página (`Reuniões`, `Configuración`, nome do app). Uma por tela.
- **Headline** (600, 1.125rem / text-lg, 1.5): título de cartão e de diálogo.
- **Title** (500, 0.875rem / text-sm): rótulos de campo e itens de lista. Quando o componente pede caixa alta, manter curta.
- **Body** (400, 0.875rem / text-sm, 1.5): descrições, metadados de reunião, texto de diálogo.
- **Label** (500, 0.75rem / text-xs): badges, navegação inferior, micro-rótulos.

### Named Rules
**The Um Display Rule.** Um único display por tela; todo o resto desce para headline, body ou label.

## Layout

Modelo de coluna única centrada com ritmo de 8/12/16. Shell `.app-shell` com largura máxima 28rem no celular, 42rem em sm (640px) e 56rem em lg (1024px); respiro lateral de 1rem mais safe-area; distância inferior de 5rem para a navegação fixa.

Páginas empilham cabeçalho, navegação por abas e seção ativa com `Suspense` próprio — o shell nunca espera dados. Listas usam divisórias de 1px; cartões respiram com padding de 16px e gap de 12–16px entre blocos.

## Elevation & Depth

Camadas tonais primeiro, sombra como vocabulário de estado — em evolução confirmada para mais profundidade. Hoje o sistema é majoritariamente plano: papel sobre papel suave, com sombras raras e contidas. A direção padrão registrada com o usuário pede presença maior de profundidade daqui em diante, sem virar decoração: sombra marca elevação real (diálogo, hover, ativo), nunca textura.

### Shadow Vocabulary
- **Repouso de cartão** (Tailwind `shadow-sm`): elevação mínima do cartão sobre o fundo.
- **Aba segmentada ativa** (Tailwind `shadow-sm`): pastilha ativa sobre o trilho secundário.
- **Polegar do switch** (Tailwind `shadow`): disco branco sobre o trilho.
- **Diálogo** (Tailwind `shadow-lg` com overlay `bg-black/60`): única elevação alta, sempre modal.

### Named Rules
**The Sombra É Estado Rule.** Superfícies em repouso são planas ou tonais; sombra entra como resposta a elevação, hover ou foco — e a nova direção padrão aceita presença maior, desde que funcional.

## Shapes

Linguagem de formas generosa e amigável: quanto menor e mais tátil o elemento, mais redondo.

Botões e campos em 12px (rounded-xl), cartões e diálogos em 16px (rounded-2xl), inputs compactos em 8px (rounded-lg), e tudo que é filtro, badge, aba ou switch em pílula total (999px). Bordas de 1px na cor de linha separam sem endurecer; sem clipes decorativos nem silhuetas próprias.

## Components

### Buttons
Contidos e táteis, com resposta física sutil ao toque.
- **Shape:** cantos generosos (12px).
- **Primary:** tinta sobre papel-contraste, altura 44px, largura total no celular e automática em sm.
- **Hover / Focus:** transição de cor, `active:scale-[0.98]`, foco visível com outline duplo deslocado.
- **Secondary / Ghost / Tertiary:** secundário em papel suave; outline com borda de linha sobre papel; ghost só texto.

### Chips
- **Style:** badge em pílula total, padding 2px 10px, texto extra-pequeno médio.
- **State:** variante secundária em papel suave; outline com borda de linha; sem estados decorativos além do necessário.

### Cards / Containers
- **Corner Style:** generoso (16px).
- **Background:** papel sobre fundo papel, com borda de linha.
- **Shadow Strategy:** repouso mínimo (ver Elevation & Depth); presença maior aceita quando marca elevação real.
- **Border:** 1px na cor de linha.
- **Internal Padding:** 16px.
- **Assinatura:** `MeetingCard` — título + badge de período, linhas de data/hora/local com ícone, rodapé de contagem de partes.

### Inputs / Fields
- **Style:** campo de 44px em papel suave, cantos de 8px, borda transparente, texto alinhado à direita com rótulo à esquerda.
- **Focus:** borda migra para o Azul Sinal; sem brilho decorativo.
- **Error / Disabled:** desabilitado com opacidade reduzida; erro segue o vocabulário de perigo do diálogo.

### Navigation
Abas em pílula (altura 36px, ativa em Azul Sinal com texto branco, inativa em papel suave) ou variante segmentada sobre trilho. Navegação inferior fixa com borda superior, ícones de 22px e rótulo extra-pequeno; ativo em Azul Sinal, inativo em texto secundário, com safe-area respeitada. Item de configuração visível só para owner.

### Dialog
Confirmação destrutiva centrada: painel em 16px com padding 24px e sombra alta sobre overlay escuro translúcido; ação de perigo em vermelho sólido, cancelamento em outline; animações de entrada/saída com fade e zoom sutis.

## Do's and Don'ts

### Do:
- **Do** manter o shell estreito e centrado com respiro inferior para a navegação fixa.
- **Do** reservar o Azul Sinal (#0ea5e9) para ativo, foco e estado.
- **Do** usar esqueletos em papel suave com pulsação durante cada carregamento por aba.
- **Do** alinhar campos em linha rótulo-esquerda / valor-direita com 44px de altura tocável.
- **Do** responder ao toque com `active:scale-[0.98]` em botões e ações.

### Don't:
- **Don't** usar gradientes de texto, brilhos coloridos ou sombras coloridas.
- **Don't** pintar grandes superfícies de tinta ou azul — o fundo é papel.
- **Don't** criar novas cores de acento fora do Azul Sinal e do vermelho de perigo.
- **Don't** bloquear o shell esperando dados; cada aba tem seu `Suspense` e fallback.
- **Don't** inventar conteúdo de programa, depoimentos ou estatísticas — estado vazio honesto quando não há dados reais.

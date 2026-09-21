---
target: reuniões
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:D:\\Projetos\\Meeting\\src\\app\\reunioes\\page.tsx"
target_fingerprint: "sha256:14a2dd74aadd84b3324ea88246cdf81ae24563efa06e61acc69cee4573d3169c"
target_path: "D:\\Projetos\\Meeting\\src\\app\\reunioes\\page.tsx"
timestamp: 2026-09-21T14-51-23Z
slug: src-app-reunioes-page-tsx
---
# Critique — Reuniões (aba reuniões) — 2026-09-21

Method: dual-agent (A: design review · B: detector). Detector CLI: 0 findings. Sem overlays (sem automação de browser no harness).

## Design Health Score (22/40 — Acceptable)

| # | Heurística | Nota | Questão-chave |
|---|-----------|------|---------------|
| 1 | Visibilidade do status | 2 | Save silencioso/sequencial sem progresso nem confirmação |
| 2 | Sistema × mundo real | 3 | Faixas TheocBase e rodízio falam o salão; mistura PT/ES quebra o dialeto |
| 3 | Controle e liberdade | 2 | Cancel tudo-ou-nada, sem undo por linha, sem voltar a hoje |
| 4 | Consistência e padrões | 2 | Pílula única ok; 3 semânticas de commit no modal; datas/idiomas alternados |
| 5 | Prevenção de erro | 2 | Cântico numérico livre, congregação texto livre, auto-create sem consentimento |
| 6 | Reconhecimento > memorização | 3 | Atual/última/leitura ajudam; truncamentos escondem o essencial |
| 7 | Flexibilidade e eficiência | 2 | Sem atalhos, sem massa, sem memória de busca entre partes |
| 8 | Estética minimalista | 3 | Cartão preto excelente; dois displays empilhados + lista longa competem |
| 9 | Recuperação de erro | 2 | Alerta genérico, sem o que salvou parcial nem como retentar |
| 10 | Ajuda e documentação | 1 | Becos sem saída; sala/rodízio/regra sem próximo passo em contexto |

## Veredito de especificidade

Autoral no modelo (cartão-sessão preto + faixas TheocBase + chip de hora + regras de elegibilidade operacionalizadas), genérico-descuidado na voz (casca PT, domínio ES). O cartão carrega 90% da identidade; o shell atlético sozinho hospedaria qualquer plano de corrida.

## O que funciona

1. Cartão-sessão como plano de jogo: preto nos dois temas, hora + faixa + designado legíveis a um braço de distância.
2. Volt como sinal: só toggle ativo, aba ativa, passo atual e ordenação — estado legível em <1s.
3. Justiça operacionalizada: rodízio + última data + frase de elegibilidade em cada nome.

## Priority Issues

**P1 — Golfo entre stage e save.** Clique prepara (ponto 6px), salvar exige rolar até o fim; save sequencial sem progresso/resumo; erro genérico. Fix: barra sticky com resumo das mudanças + progresso por lote + confirmação com undo.
**P1 — Fratura de idioma PT/ES.** `Entre semana/Salvar/Baixar/Ajudante` convivem com `Cargando/Cambio/Etapas/Lector`. Viola PRODUCT.md e quebra leitor de tela. Fix: congelar dicionário ES via es.ts + formatDateES; lint contra literais PT.
**P2 — Modal com 4 trabalhos e 3 commits.** Cântico stage+fecha, sala stage-vivo, pessoa stage+fecha; título truncado. Fix: modo-cântico vs modo-pessoa, commit único no rodapé, nunca fechar no clique.
**P2 — Stepper desorientado.** Só a segunda-feira, setas infinitas, sem intervalo/hoje/dots; `mondayOf` deriva UTC. Fix: intervalo + dia da reunião, botão Hoje, dots de programa, cálculo local.
**P2 — Linha densa e truncada.** Nome em 144px, chevron fantasma, membro vê botão que nada faz, dirty sem aria. Fix: 2 linhas ao designado, pill no chevron, read-only estático, badge com aria-label.

## Persona red flags

**Alex (power-user):** 15 modais/semana sem massa nem repetição; busca/ordenação resetam por parte; save sequencial trava em rede lenta.
**Sam (teclado/leitor):** dirty dot sem anúncio; título truncado; troca de passo sem live region; marcos com idioma cruzado.
**Casey (mobile uma mão):** save/imprimir fora do polegar; staged só em memória (perde ao interromper); modal com scroll aninhado; auto-save offline sem fila visível.

## Observações menores

- Key de linha usa horário (reordena foco se reimportar); usar id estável.
- Três línguas de espera: `Salvando…` vs `Cargando…` vs `Atualizando…`.
- Imprimir/iCal apagados parecem desabilitados.
- Stepper display 2xl compete com o PageHeader 4xl (Um Display Rule no limite).

## Perguntas provocativas

1. Se o estado stage/salvo é o mais importante, por que é um ponto de 6px e não a manchete?
2. O que o stepper perderia virando calendário com dots — e o que o organizador ganharia?
3. Se o modal já sabe elegibilidade e rodízio, por que não sugere 3 candidatos e deixa o humano vetar?

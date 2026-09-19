# Algoritmo de designações de limpeza

Como o Meeting gera o rodízio de limpeza (`src/features/cleaning/domain/assign-cleaning.ts`).

## Visão geral

1. **Filtro de dias** (`analyzeDays`): só dias de reunião (meio de semana / fim de
   semana). Semana com assembleia regional, com viajante ou com representante é
   pulada; memorial mantém a limpeza; exceção `no_meeting` pula o dia.
2. **Fairness global**: antes de gerar, `createCleaningProgram` lê designações dos
   últimos `CLEANING_HISTORY_DAYS` (90) dias **sem limite superior** — drafts
   futuros (ainda não realizados) também contam. Cada dia gerado atualiza os
   contadores, então o dia N considera os dias 1..N-1 da mesma geração.
3. **Ordem dos setores**: restritivos primeiro — sexo específico, depois só-adulto,
   depois maior `peopleCount`.
4. **Preenchimento por setor em 8 passadas** (ver abaixo).
5. **Persistência**: programa `draft` + designações, com anti-overlap de período
   por tipo (exceto arquivados). Troca manual é estrita (sem fallback).

## As 8 passadas (por setor/dia)

| # | Descanso sessão anterior | Descanso semanal (seg–dom) | Jovem em setor adulto |
|---|--------------------------|----------------------------|-----------------------|
| 1 | respeita                 | respeita                   | não                   |
| 2 | relaxa                   | respeita                   | não                   |
| 3 | respeita                 | relaxa                     | não                   |
| 4 | relaxa                   | relaxa                     | não                   |
| 5–8 | iguais a 1–4           |                            | **sim (fallback)**    |

Setores que permitem jovem usam só as passadas 1–4. Ninguém trabalha em 2 setores
no mesmo dia. Cada fallback usado gera um **aviso** exibido na UI
("revise antes de confirmar").

## Score do candidato

```
score = total * CLEANING_SCORE_TOTAL_WEIGHT (12)
      + noMesmoSetor * CLEANING_SCORE_SECTOR_WEIGHT (30)
      + max(0, CLEANING_SCORE_RECENCY_DAYS (40) - diasDesdeUltima)
```

Menor score vence; desempate por nome. O peso alto no setor força rodízio entre
setores em vez de concentrar a pessoa onde ela já trabalhou.

## Família atômica

Chefe + membros entram **juntos no mesmo setor ou não entram** (não divide o
núcleo entre setores). Se a família não couber nas vagas restantes, o chefe é
pulado. O membro só vai sozinho se o chefe já foi usado no dia ou não pode
entrar naquele setor.

## Regra de jovem

Setor com `allowYoung = false` (banheiros por padrão) só recebe jovem no fallback
(passadas 5–8), com aviso. A troca manual **bloqueia** jovem em setor adulto.

## Limitações conhecidas

- **Sem transação**: o driver `neon-http` não suporta `db.transaction`; a criação
  usa deleção compensatória (apaga o programa se as designações falharem).
- **Anti-overlap com janela de corrida**: dois owners simultâneos podem passar na
  checagem; mitigado com re-checagem antes de gravar.
- **Histórico truncado**: acima de `CLEANING_HISTORY_ROW_LIMIT` (5000) linhas, o
  rodízio usa amostra parcial e emite aviso.

## Testes

`src/features/cleaning/domain/__tests__/assign-cleaning.test.ts`
(`npm run test:unit`): descanso semanal, família atômica, jovem, score,
histórico futuro, fallbacks e `analyzeDays`.

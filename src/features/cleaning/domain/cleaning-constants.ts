/**
 * Constantes do algoritmo de limpeza.
 *
 * Centraliza os números mágicos do sorteio para facilitar ajuste e revisão.
 * Como ajustar:
 * - Pesos do score: aumente `CLEANING_SCORE_SECTOR_WEIGHT` para forçar mais
 *   rodízio entre setores; aumente `CLEANING_SCORE_TOTAL_WEIGHT` para priorizar
 *   quem trabalhou menos no geral; `CLEANING_SCORE_RECENCY_DAYS` define por
 *   quantos dias uma designação recente ainda pesa no desempate.
 */

/** Peso de cada designação passada no total geral da pessoa. */
export const CLEANING_SCORE_TOTAL_WEIGHT = 12;

/** Peso de cada designação passada no mesmo setor (força rodízio entre setores). */
export const CLEANING_SCORE_SECTOR_WEIGHT = 30;

/** Janela em dias em que a última designação ainda soma pontos de recência. */
export const CLEANING_SCORE_RECENCY_DAYS = 40;

/** Quantos dias de histórico alimentam o fairness do sorteio. */
export const CLEANING_HISTORY_DAYS = 90;

/** Teto de linhas lidas do histórico por geração (proteção contra tabelas grandes). */
export const CLEANING_HISTORY_ROW_LIMIT = 5000;

/** Máximo de datas guardadas por pessoa para o descanso semanal. */
export const CLEANING_HISTORY_DATES_PER_PERSON = 200;

/** Pessoas assumidas por setor quando `peopleCount` é nulo. */
export const CLEANING_DEFAULT_PEOPLE_PER_SECTOR = 2;

/** Período máximo de um programa de limpeza, em dias. */
export const CLEANING_MAX_RANGE_DAYS = 366;

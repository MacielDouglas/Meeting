/**
 * Seleção inteligente do conteúdo da semana: encontra exatamente a semana da
 * apostila e o estudo da Sentinela correspondentes à segunda-feira do programa,
 * sem defaults (devolve null quando não há correspondência exata).
 */

export interface WorkbookWeekMatch {
  weekStart: string | null | undefined;
}

export interface WatchtowerArticleMatch {
  weekStart: string | null;
  weekEnd: string | null;
}

/**
 * Índice da semana da apostila cuja segunda-feira é exatamente a do programa.
 * Comparação de strings vale porque ambas são AAAA-MM-DD.
 */
export function findWorkbookWeekIndex(
  weeks: readonly WorkbookWeekMatch[],
  programWeekStart: string,
): number | null {
  const index = weeks.findIndex((week) => week.weekStart === programWeekStart);
  return index >= 0 ? index : null;
}

/**
 * Índice do artigo da Sentinela cuja semana de estudo contém a segunda-feira
 * do programa (semana do estudo = segunda a domingo). Artigos sem intervalo
 * válido são ignorados.
 */
export function findWatchtowerArticleIndex(
  articles: readonly WatchtowerArticleMatch[],
  programWeekStart: string,
): number | null {
  const index = articles.findIndex(
    (article) =>
      article.weekStart != null &&
      article.weekEnd != null &&
      article.weekStart <= programWeekStart &&
      programWeekStart <= article.weekEnd,
  );
  return index >= 0 ? index : null;
}

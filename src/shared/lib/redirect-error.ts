/**
 * `redirect()` do Next lança um erro especial (digest `NEXT_REDIRECT`) que
 * DEVE atravessar nossos try/catch: engoli-lo cancela a navegação e exibe
 * um erro falso no sucesso. Use no `catch` de toda action que redireciona.
 */
export function isNextRedirectError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest = "digest" in error && typeof error.digest === "string" ? error.digest : "";
  if (digest.startsWith("NEXT_REDIRECT")) return true;
  return error instanceof Error && error.message.startsWith("NEXT_REDIRECT");
}

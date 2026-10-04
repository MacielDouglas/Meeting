/**
 * Limite simples por IP para a rota pública do enlace (60 req/min).
 * Defesa barata contra adivinhação online do token; a segurança real vem
 * dos ~190 bits do token (força bruta offline inviável).
 * Nota: janela em memória por instância — suficiente como trava, não como
 * garantia distribuída.
 */
export const SHARE_RATE_WINDOW_MS = 60_000;
export const SHARE_RATE_MAX_REQUESTS = 60;
const MAX_TRACKED_IPS = 5_000;

const hits = new Map<string, number[]>();

export function isPublicShareRateLimited(ip: string, now: number = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < SHARE_RATE_WINDOW_MS);
  if (recent.length >= SHARE_RATE_MAX_REQUESTS) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > MAX_TRACKED_IPS) {
    const oldest = hits.keys().next().value;
    if (oldest !== undefined) hits.delete(oldest);
  }
  return false;
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded && forwarded !== "" ? forwarded : "unknown";
}

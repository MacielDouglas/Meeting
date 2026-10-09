/**
 * Trava simples contra adivinhação online de códigos de entrada: 10 falhas em
 * 10 minutos por conta+código. Como `redeemJoinToken` exige owner, o abuso
 * exigiria sessão comprometida — isto é defesa em profundidade, não garantia
 * distribuída (janela em memória por instância).
 */
export const JOIN_REDEEM_WINDOW_MS = 10 * 60 * 1000;
export const JOIN_REDEEM_MAX_FAILURES = 10;
const MAX_TRACKED_KEYS = 5_000;

const failures = new Map<string, number[]>();

function trackKey(ownerId: string, code: string): string {
  return `${ownerId}:${code}`;
}

function prune(key: string, now: number): number[] {
  const recent = (failures.get(key) ?? []).filter((time) => now - time < JOIN_REDEEM_WINDOW_MS);
  failures.set(key, recent);
  if (failures.size > MAX_TRACKED_KEYS) {
    const oldest = failures.keys().next().value;
    if (oldest !== undefined) failures.delete(oldest);
  }
  return recent;
}

export function isJoinRedeemBlocked(
  ownerId: string,
  code: string,
  now: number = Date.now(),
): boolean {
  return prune(trackKey(ownerId, code), now).length >= JOIN_REDEEM_MAX_FAILURES;
}

export function registerJoinRedeemFailure(
  ownerId: string,
  code: string,
  now: number = Date.now(),
): void {
  const key = trackKey(ownerId, code);
  prune(key, now).push(now);
}

/** Zera a trava (uso em testes que exercitam falhas repetidas). */
export function resetJoinRedeemAttempts(): void {
  failures.clear();
}

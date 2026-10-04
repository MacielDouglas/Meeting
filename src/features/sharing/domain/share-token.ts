import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Token alfanumérico de 32 caracteres (A–Z, a–z, 0–9): ~190 bits de entropia. */
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9]{32}$/;

const TOKEN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function isShareTokenFormat(value: string): boolean {
  return SHARE_TOKEN_PATTERN.test(value.trim());
}

export function normalizeShareToken(value: string): string {
  return value.trim();
}

/** Gera um token de 32 caracteres. `randomSource` existe só para testes determinísticos. */
export function generateShareToken(randomSource: (size: number) => Buffer = randomBytes): string {
  const bytes = randomSource(32);
  return Array.from(bytes, (byte) => TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length]).join("");
}

/** SHA-256 hex do token: o que fica guardado no banco (o segredo nunca persiste). */
export function hashShareToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Comparação em tempo constante entre o hash guardado e o hash do token apresentado. */
export function shareTokenHashEquals(storedHex: string, presentedHex: string): boolean {
  const a = Buffer.from(storedHex, "utf8");
  const b = Buffer.from(presentedHex, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

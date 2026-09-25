import { randomBytes } from "node:crypto";

/** Alfabeto sem ambíguos (sem 0/O, 1/I/L) para leitura em voz alta. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const JOIN_TOKEN_CODE_PATTERN =
  /^[A-HJ-KM-NP-Z2-9]{3}-[A-HJ-KM-NP-Z2-9]{3}-[A-HJ-KM-NP-Z2-9]{3}$/;

export function normalizeJoinTokenCode(value: string): string {
  return value.trim().toUpperCase().replace(/[\s]+/g, "");
}

export function isJoinTokenCodeFormat(value: string): boolean {
  return JOIN_TOKEN_CODE_PATTERN.test(normalizeJoinTokenCode(value));
}

/** Gera um código XXX-XXX-XXX. `randomSource` existe só para testes determinísticos. */
export function generateJoinTokenCode(
  randomSource: (size: number) => Buffer = randomBytes,
): string {
  const bytes = randomSource(9);
  const chars = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]);
  return `${chars.slice(0, 3).join("")}-${chars.slice(3, 6).join("")}-${chars.slice(6, 9).join("")}`;
}

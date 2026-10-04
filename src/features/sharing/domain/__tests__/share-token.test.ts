import { describe, expect, it } from "vitest";
import {
  generateShareToken,
  hashShareToken,
  isShareTokenFormat,
  normalizeShareToken,
  SHARE_TOKEN_PATTERN,
  shareTokenHashEquals,
} from "@/features/sharing/domain/share-token";

const TOKEN = "AbC123XyZ456DeF789GhI012JkL345Mn";

describe("share-token", () => {
  it("gera tokens alfanuméricos de 32 caracteres (~190 bits)", () => {
    const token = generateShareToken();
    expect(token).toMatch(SHARE_TOKEN_PATTERN);
    expect(token).toHaveLength(32);
  });

  it("gera tokens distintos a cada chamada", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateShareToken()));
    expect(tokens.size).toBeGreaterThan(1);
  });

  it("valida o formato de 32 alfanuméricos (sem legado de 12)", () => {
    expect(isShareTokenFormat(TOKEN)).toBe(true);
    expect(isShareTokenFormat("AbC123XyZ456")).toBe(false);
    expect(isShareTokenFormat(`${TOKEN}X`)).toBe(false);
    expect(isShareTokenFormat(`${TOKEN.slice(0, -1)}!`)).toBe(false);
    expect(isShareTokenFormat("")).toBe(false);
  });

  it("normaliza espaços das bordas", () => {
    expect(normalizeShareToken(`  ${TOKEN} `)).toBe(TOKEN);
  });

  it("deriva sempre o mesmo hash para o mesmo token", () => {
    expect(hashShareToken(TOKEN)).toBe(hashShareToken(TOKEN));
    expect(hashShareToken(TOKEN)).not.toBe(hashShareToken(`${TOKEN.slice(0, -1)}m`));
    expect(hashShareToken(TOKEN)).toHaveLength(64);
  });

  it("compara hashes em tempo constante", () => {
    const hash = hashShareToken(TOKEN);
    expect(shareTokenHashEquals(hash, hashShareToken(TOKEN))).toBe(true);
    expect(shareTokenHashEquals(hash, hashShareToken(`${TOKEN.slice(0, -1)}m`))).toBe(false);
    expect(shareTokenHashEquals(hash, "curto")).toBe(false);
  });
});

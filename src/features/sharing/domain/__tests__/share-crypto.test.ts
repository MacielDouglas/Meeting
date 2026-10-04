import { describe, expect, it } from "vitest";
import {
  decryptSharePayload,
  deriveShareKey,
  encryptSharePayload,
} from "@/features/sharing/domain/share-crypto";

const TOKEN = "AbC123XyZ456DeF789GhI012JkL345Mn";
const WRONG_TOKEN = "AbC123XyZ456DeF789GhI012JkL345Mm";

describe("share-crypto", () => {
  it("deriva chave de 32 bytes do token", () => {
    expect(deriveShareKey(TOKEN)).toHaveLength(32);
    expect(deriveShareKey(TOKEN).equals(deriveShareKey(TOKEN))).toBe(true);
    expect(deriveShareKey(TOKEN).equals(deriveShareKey(WRONG_TOKEN))).toBe(false);
  });

  it("cifra e decifra o payload com o mesmo token", () => {
    const plaintext = JSON.stringify({ weekStart: "2026-09-28", names: ["Ana", "Juan"] });
    const envelope = encryptSharePayload(TOKEN, plaintext);
    expect(envelope.v).toBe(1);
    expect(envelope.alg).toBe("aes-256-gcm");
    expect(envelope.iv).not.toBe("");
    expect(envelope.tag).not.toBe("");
    expect(envelope.data).not.toContain("Ana");
    expect(decryptSharePayload(TOKEN, envelope)).toBe(plaintext);
  });

  it("gera corpo diferente a cada cifragem (IV aleatório)", () => {
    const first = encryptSharePayload(TOKEN, "hola");
    const second = encryptSharePayload(TOKEN, "hola");
    expect(first.data).not.toBe(second.data);
    expect(first.iv).not.toBe(second.iv);
  });

  it("falha ao decifrar com token errado", () => {
    const envelope = encryptSharePayload(TOKEN, "segredo");
    expect(() => decryptSharePayload(WRONG_TOKEN, envelope)).toThrow();
  });

  it("rejeita envelope adulterado", () => {
    const envelope = encryptSharePayload(TOKEN, "segredo");
    const tampered = { ...envelope, data: `${envelope.data.slice(0, -4)}AAAA` };
    expect(() => decryptSharePayload(TOKEN, tampered)).toThrow();
  });
});

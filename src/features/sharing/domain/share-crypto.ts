import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const SHARE_CRYPTO_ALGORITHM = "aes-256-gcm" as const;
export const SHARE_ENVELOPE_VERSION = 1 as const;

export interface ShareEnvelope {
  v: typeof SHARE_ENVELOPE_VERSION;
  alg: typeof SHARE_CRYPTO_ALGORITHM;
  /** IV aleatório de 12 bytes, base64. */
  iv: string;
  /** Auth tag GCM de 16 bytes, base64. */
  tag: string;
  /** Ciphertext, base64. */
  data: string;
}

/** Chave AES-256 derivada do token: SHA-256(token). O token é o segredo compartilhado. */
export function deriveShareKey(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

function toBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

function fromBase64(value: string): Buffer {
  return Buffer.from(value, "base64");
}

/** Cifra o JSON da semana. Todo acesso usa um IV novo: o corpo nunca se repete. */
export function encryptSharePayload(token: string, plaintext: string): ShareEnvelope {
  const key = deriveShareKey(token);
  const iv = randomBytes(12);
  const cipher = createCipheriv(SHARE_CRYPTO_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    v: SHARE_ENVELOPE_VERSION,
    alg: SHARE_CRYPTO_ALGORITHM,
    iv: toBase64(iv),
    tag: toBase64(cipher.getAuthTag()),
    data: toBase64(ciphertext),
  };
}

/** Decifra com o mesmo token (uso em testes e no exemplo para o consumidor). */
export function decryptSharePayload(token: string, envelope: ShareEnvelope): string {
  if (envelope.v !== SHARE_ENVELOPE_VERSION || envelope.alg !== SHARE_CRYPTO_ALGORITHM) {
    throw new Error("Envelope no soportado.");
  }
  const key = deriveShareKey(token);
  const decipher = createDecipheriv(SHARE_CRYPTO_ALGORITHM, key, fromBase64(envelope.iv));
  decipher.setAuthTag(fromBase64(envelope.tag));
  const plaintext = Buffer.concat([decipher.update(fromBase64(envelope.data)), decipher.final()]);
  return plaintext.toString("utf8");
}

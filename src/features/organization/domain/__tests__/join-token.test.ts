import { describe, expect, it } from "vitest";
import {
  generateJoinTokenCode,
  isJoinTokenCodeFormat,
  JOIN_TOKEN_CODE_PATTERN,
  normalizeJoinTokenCode,
} from "@/features/organization/domain/join-token";

describe("join-token", () => {
  it("gera códigos no formato XXX-XXX-XXX sem caracteres ambíguos", () => {
    const code = generateJoinTokenCode();
    expect(code).toMatch(JOIN_TOKEN_CODE_PATTERN);
    expect(code).toHaveLength(11);
    for (const char of ["0", "O", "1", "I", "L"]) {
      expect(code).not.toContain(char);
    }
  });

  it("gera códigos distintos a cada chamada", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateJoinTokenCode()));
    expect(codes.size).toBeGreaterThan(1);
  });

  it("normaliza caixa, espaços e hífens extras", () => {
    expect(normalizeJoinTokenCode("  abc-def-ghj ")).toBe("ABC-DEF-GHJ");
    expect(normalizeJoinTokenCode("abc def ghj")).toBe("ABCDEFGHJ");
  });

  it("valida o formato após normalizar", () => {
    expect(isJoinTokenCodeFormat("abc-def-ghj")).toBe(true);
    expect(isJoinTokenCodeFormat("ABC-DEF-GH")).toBe(false);
    expect(isJoinTokenCodeFormat("ABC-DEF-GH0")).toBe(false);
    expect(isJoinTokenCodeFormat("")).toBe(false);
  });
});

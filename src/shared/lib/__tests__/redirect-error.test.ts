import { describe, expect, it } from "vitest";
import { isNextRedirectError } from "@/shared/lib/redirect-error";

describe("isNextRedirectError", () => {
  it("detecta o digest do Next", () => {
    expect(isNextRedirectError({ digest: "NEXT_REDIRECT;replace;/bienvenida;307;" })).toBe(true);
  });

  it("detecta a mensagem (mocks de redirect em testes)", () => {
    expect(isNextRedirectError(new Error("NEXT_REDIRECT:/administracion/personas"))).toBe(true);
  });

  it("rejeita erros comuns, nulos e primitivos", () => {
    expect(isNextRedirectError(new Error("connect failed"))).toBe(false);
    expect(isNextRedirectError(null)).toBe(false);
    expect(isNextRedirectError(undefined)).toBe(false);
    expect(isNextRedirectError("NEXT_REDIRECT:/x")).toBe(false);
    expect(isNextRedirectError({ digest: 42 })).toBe(false);
  });
});

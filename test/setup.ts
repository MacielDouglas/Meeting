import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Env fake de importação: nenhum valor real, nenhum serviço real.
// Garante que módulos como better-auth/db carreguem sem .env em testes/CI.
process.env.DATABASE_URL ??= "postgres://user:pass@127.0.0.1:5432/vitest-fake";
process.env.BETTER_AUTH_SECRET ??= "vitest-fake-secret";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.GOOGLE_CLIENT_ID ??= "vitest-fake-client-id";
process.env.GOOGLE_CLIENT_SECRET ??= "vitest-fake-client-secret";

// Tripwire: teste nenhum pode falar com a rede (nem Neon, nem Google).
globalThis.fetch = ((input: RequestInfo | URL) => {
  throw new Error(`Acesso à rede proibido em testes: ${String(input)}`);
}) as typeof fetch;

if (typeof window !== "undefined") {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;

  Element.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  cleanup();
});

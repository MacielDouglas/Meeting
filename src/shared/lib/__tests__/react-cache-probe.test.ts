import { cache } from "react";
import { describe, expect, it } from "vitest";

const cached = cache((value: string) => value);

describe("React.cache no ambiente de teste", () => {
  it("mantém resultado por argumento dentro do mesmo módulo", () => {
    expect(cached("a")).toBe("a");
    expect(cached("b")).toBe("b");
    expect(cached("a")).toBe("a");
  });

  it("não memoiza em ambiente de teste: cada chamada reexecuta a função", () => {
    const fn = cache((x: number) => ({ x }));
    expect(fn(1)).not.toBe(fn(1));
  });
});

import { describe, expect, it } from "vitest";
import { formatDateBR, todayLocalISO } from "@/shared/lib/format-date";

describe("formatDateBR", () => {
  it("converte AAAA-MM-DD em DD-MM-AAAA", () => {
    expect(formatDateBR("2026-09-20")).toBe("20-09-2026");
    expect(formatDateBR("2026-01-05")).toBe("05-01-2026");
  });

  it("devolve o original quando não é data ISO", () => {
    expect(formatDateBR("20/09/2026")).toBe("20/09/2026");
    expect(formatDateBR("")).toBe("");
  });

  it("todayLocalISO gera AAAA-MM-DD local", () => {
    expect(todayLocalISO(new Date(2026, 8, 20, 15, 30))).toBe("2026-09-20");
  });
});

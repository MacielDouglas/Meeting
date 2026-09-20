import { describe, expect, it } from "vitest";
import { selectInitialKind } from "@/features/weekly-schedule/domain/schedule";

describe("selectInitialKind", () => {
  // Semana com reunião entre semana na quarta 2026-09-23.
  it("mostra entre semana quando hoje é antes do dia da reunião", () => {
    expect(selectInitialKind("2026-09-21", "2026-09-23")).toBe("midweek");
  });

  it("mostra entre semana no próprio dia da reunião", () => {
    expect(selectInitialKind("2026-09-23", "2026-09-23")).toBe("midweek");
  });

  it("mostra fim de semana quando o dia da reunião entre semana já passou", () => {
    expect(selectInitialKind("2026-09-24", "2026-09-23")).toBe("weekend");
    expect(selectInitialKind("2026-09-27", "2026-09-23")).toBe("weekend");
  });
});

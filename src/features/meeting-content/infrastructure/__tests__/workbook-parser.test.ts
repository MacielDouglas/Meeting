import { describe, expect, it } from "vitest";
import { resolveWorkbookWeekStart } from "@/features/meeting-content/infrastructure/workbook-parser";

describe("resolveWorkbookWeekStart", () => {
  it("resolve rótulo es sem ano usando o nome da edição", () => {
    expect(resolveWorkbookWeekStart("6-12 de julio", "Apostila (julio de 2026)")).toBe(
      "2026-07-06",
    );
  });

  it("resolve rótulo pt", () => {
    expect(resolveWorkbookWeekStart("13-19 de setembro", "Apostila (setembro de 2025)")).toBe(
      "2025-09-13",
    );
  });

  it("devolve null sem ano ou com data inválida", () => {
    expect(resolveWorkbookWeekStart("6-12 de julio", "Apostila")).toBeNull();
    expect(
      resolveWorkbookWeekStart("30-31 de fevereiro", "Apostila (fevereiro de 2026)"),
    ).toBeNull();
    expect(resolveWorkbookWeekStart("semana qualquer", "Apostila (julio de 2026)")).toBeNull();
  });
});

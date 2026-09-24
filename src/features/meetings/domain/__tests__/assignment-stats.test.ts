import { describe, expect, it } from "vitest";
import { summarizeAssignments } from "@/features/meetings/domain/assignment-stats";

describe("summarizeAssignments", () => {
  it("conta designadas sobre o total designável", () => {
    const items = [
      { countable: true, assigned: true },
      { countable: true, assigned: true },
      { countable: true, assigned: true },
      { countable: true, assigned: false },
      { countable: true, assigned: false },
    ];
    expect(summarizeAssignments(items)).toEqual({ assigned: 3, total: 5 });
  });

  it("ignora partes não designáveis", () => {
    const items = [
      { countable: false, assigned: true },
      { countable: true, assigned: false },
    ];
    expect(summarizeAssignments(items)).toEqual({ assigned: 0, total: 1 });
  });

  it("zera sem partes", () => {
    expect(summarizeAssignments([])).toEqual({ assigned: 0, total: 0 });
  });
});

import { describe, expect, it } from "vitest";
import {
  findWatchtowerArticleIndex,
  findWorkbookWeekIndex,
} from "@/features/meetings/domain/match-meeting-content";

describe("findWorkbookWeekIndex", () => {
  const weeks = [{ weekStart: "2026-07-06" }, { weekStart: "2026-07-13" }];

  it("encontra a semana exata", () => {
    expect(findWorkbookWeekIndex(weeks, "2026-07-13")).toBe(1);
  });

  it("devolve null sem correspondência exata (sem default)", () => {
    expect(findWorkbookWeekIndex(weeks, "2026-07-20")).toBeNull();
    expect(findWorkbookWeekIndex([], "2026-07-13")).toBeNull();
  });

  it("ignora semanas legadas sem weekStart", () => {
    expect(findWorkbookWeekIndex([{ weekStart: null }, ...weeks], "2026-07-06")).toBe(1);
  });
});

describe("findWatchtowerArticleIndex", () => {
  const articles = [
    { weekStart: "2026-07-06", weekEnd: "2026-07-12" },
    { weekStart: "2026-07-13", weekEnd: "2026-07-19" },
  ];

  it("encontra o estudo cuja semana contém a segunda do programa", () => {
    expect(findWatchtowerArticleIndex(articles, "2026-07-13")).toBe(1);
    expect(findWatchtowerArticleIndex(articles, "2026-07-06")).toBe(0);
  });

  it("devolve null sem estudo correspondente (sem default)", () => {
    expect(findWatchtowerArticleIndex(articles, "2026-07-20")).toBeNull();
    expect(findWatchtowerArticleIndex([], "2026-07-13")).toBeNull();
  });

  it("ignora artigos sem intervalo válido", () => {
    const withInvalid = [{ weekStart: null, weekEnd: null }, ...articles];
    expect(findWatchtowerArticleIndex(withInvalid, "2026-07-13")).toBe(2);
  });
});

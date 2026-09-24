import { describe, expect, it } from "vitest";
import {
  buildMidweekParts,
  buildWeekendParts,
  classifySavedPart,
  type WorkbookWeekLike,
} from "@/features/meetings/domain/build-meeting-program";
import type { CircuitVisitDetails } from "@/features/meetings/domain/special-event-weeks";

const VISIT: CircuitVisitDetails = {
  speakerName: "Hno. Pérez",
  midweekTheme: "Sigamos buscando primero el Reino",
  publicTalkTheme: "¿Vivimos lo que creemos?",
  finalTalkTheme: "Fortalezcamos nuestra hermandad",
};

const WEEK: WorkbookWeekLike = {
  meeting: {
    song: [{ openingSong: "Canción 12", middleSong: "Canción 3", closingSong: "Canción 156" }],
    "TREASURES FROM GODS WORD": [{ title: "Charla", duration: "(10 mins.)" }],
    "APPLY YOURSELF TO THE FIELD MINISTRY": [],
    "LIVING AS CHRISTIANS": [
      { title: "Tema local", duration: "(10 mins.)" },
      { title: "Estudio bíblico de la congregación", duration: "(30 mins.)" },
      { title: "Tema después", duration: "(5 mins.)" },
    ],
  },
};

const SONGS = new Map<number, string>();

describe("visita do superintendente no meio de semana", () => {
  it("troca o estudo pelo discurso de 30min, sem designação", () => {
    const parts = buildMidweekParts(WEEK, "19:30", SONGS, VISIT);
    expect(parts.some((p) => p.key === "congregation-study")).toBe(false);
    const talk = parts.find((p) => p.key === "circuit-visit-talk");
    expect(talk?.title).toBe("Sigamos buscando primero el Reino");
    expect(talk?.subtitle).toBe("Hno. Pérez");
    expect(talk?.durationMinutes).toBe(30);
    expect(talk?.capability).toBeUndefined();
    // Ocupa a posição do estudo: depois do tema local, antes do tema depois.
    const keys = parts.map((p) => p.key);
    expect(keys.indexOf("circuit-visit-talk")).toBeGreaterThan(keys.indexOf("living-0"));
    expect(keys.indexOf("circuit-visit-talk")).toBeLessThan(keys.indexOf("living-after-0"));
  });

  it("mantém o relógio sequencial", () => {
    const parts = buildMidweekParts(WEEK, "19:30", SONGS, VISIT);
    for (let i = 1; i < parts.length; i++) {
      expect(parts[i].startTime >= parts[i - 1].startTime).toBe(true);
    }
  });

  it("sem visita mantém o estudo", () => {
    const parts = buildMidweekParts(WEEK, "19:30", SONGS);
    expect(parts.some((p) => p.key === "congregation-study")).toBe(true);
    expect(parts.some((p) => p.key === "circuit-visit-talk")).toBe(false);
  });
});

describe("visita do superintendente no fim de semana", () => {
  const article = { title: "Estudio", openingSong: 12, closingSong: 156 };

  it("discurso público do superintendente, sem designação", () => {
    const parts = buildWeekendParts("10:00", null, "Tema", 1, article, SONGS, VISIT);
    const talk = parts.find((p) => p.key === "public-talk");
    expect(talk?.subtitle).toBe("Hno. Pérez");
    expect(talk?.durationMinutes).toBe(30);
    expect(talk?.capability).toBeUndefined();
  });

  it("Atalaya reduzida sem leitor + discurso final de 30min", () => {
    const parts = buildWeekendParts("10:00", null, "Tema", 1, article, SONGS, VISIT);
    const study = parts.find((p) => p.key === "watchtower-study");
    expect(study?.durationMinutes).toBe(30);
    expect(study?.needsHelper).toBe(false);
    const final = parts.find((p) => p.key === "circuit-visit-final-talk");
    expect(final?.title).toBe("Fortalezcamos nuestra hermandad");
    expect(final?.subtitle).toBe("Hno. Pérez");
    expect(final?.durationMinutes).toBe(30);
    expect(final?.capability).toBeUndefined();
    // Ordem: estudo, discurso final, cântico final.
    const keys = parts.map((p) => p.key);
    expect(keys.indexOf("circuit-visit-final-talk")).toBe(keys.indexOf("watchtower-study") + 1);
    expect(keys.indexOf("closing-song")).toBe(keys.indexOf("circuit-visit-final-talk") + 1);
  });

  it("sem visita mantém estudo de 60min com leitor", () => {
    const parts = buildWeekendParts("10:00", null, "Tema", 1, article, SONGS);
    const study = parts.find((p) => p.key === "watchtower-study");
    expect(study?.durationMinutes).toBe(60);
    expect(study?.needsHelper).toBe(true);
    expect(parts.some((p) => p.key === "circuit-visit-final-talk")).toBe(false);
    expect(parts.find((p) => p.key === "public-talk")?.capability).toBe("publicTalk");
  });
});

describe("classifySavedPart na visita", () => {
  it("discursos do superintendente não pedem pessoa", () => {
    expect(classifySavedPart("circuit-visit-talk", "T", "S", "midweek")).toEqual({});
    expect(classifySavedPart("circuit-visit-final-talk", "T", "S", "weekend")).toEqual({});
  });
});

import { mockDb } from "@test/mock-db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPublicRangePayload,
  buildPublicWeekPayload,
} from "@/features/sharing/application/share-payload";

vi.mock("@/shared/lib/db", async () => {
  const { mockDb } = await import("@test/mock-db");
  return { getDb: () => mockDb.database };
});

beforeEach(() => {
  mockDb.reset();
  vi.resetAllMocks();
});

describe("buildPublicWeekPayload (limpeza)", () => {
  it("inclui a limpeza da semana (confirmada e rascunho), exceto arquivada", async () => {
    mockDb.enqueue([{ congregationName: "Congregación Este" }]);
    mockDb.enqueue([]); // sem programa entre semana
    mockDb.enqueue([]); // sem programa de fim de semana
    mockDb.enqueue([]); // sem apoio
    mockDb.enqueue([
      {
        date: "2026-09-30",
        sectorName: "Grupo 1",
        sectorNameEs: "Grupo 1 ES",
        task: "Barrer y trapear",
        taskEs: "Barrer y trapear ES",
        personName: "Luis Gómez",
        status: "confirmed",
      },
      {
        date: "2026-10-04",
        sectorName: "Grupo 2",
        sectorNameEs: null,
        task: null,
        taskEs: null,
        personName: "Ana Torres",
        status: "draft",
      },
      {
        date: "2026-10-03",
        sectorName: "Grupo 3",
        sectorNameEs: null,
        task: null,
        taskEs: null,
        personName: "Pedro Ruiz",
        status: "archived",
      },
    ]);
    const payload = await buildPublicWeekPayload(new Date("2026-09-30T12:00:00Z"));
    expect(payload.cleaning).toEqual([
      {
        date: "2026-09-30",
        sectorName: "Grupo 1",
        sectorNameEs: "Grupo 1 ES",
        task: "Barrer y trapear",
        taskEs: "Barrer y trapear ES",
        personName: "Luis Gómez",
      },
      {
        date: "2026-10-04",
        sectorName: "Grupo 2",
        sectorNameEs: "",
        task: "",
        taskEs: "",
        personName: "Ana Torres",
      },
    ]);
    expect(payload.duties).toEqual([]);
  });

  it("vira vazio quando as tabelas de limpeza não existem", async () => {
    mockDb.enqueue([{ congregationName: "Congregación Este" }]);
    mockDb.enqueue([]); // sem programa entre semana
    mockDb.enqueue([]); // sem programa de fim de semana
    mockDb.enqueue([]); // sem apoio
    mockDb.enqueueRejection(new Error('relation "cleaning_assignments" does not exist'));
    const payload = await buildPublicWeekPayload(new Date("2026-09-30T12:00:00Z"));
    expect(payload.cleaning).toEqual([]);
    expect(payload.congregationName).toBe("Congregación Este");
  });
});

function programRow(id: string, date: string) {
  return { id, date };
}

function weekAssignmentRow(overrides: Record<string, unknown> = {}) {
  return {
    partKey: "bible-reading",
    section: "Sección",
    title: "Lectura de la Biblia",
    subtitle: "",
    startTime: "19:30",
    durationMinutes: 10,
    personName: "Ana Torres",
    helperPersonName: "",
    songNumber: null,
    songTheme: "",
    speakerCongregation: "",
    ...overrides,
  };
}

/** Bloco de consultas de uma semana: 2 programas + 2 listas + apoio + limpeza. */
function enqueueWeekBlock(options: { withProgram: boolean } = { withProgram: false }) {
  if (options.withProgram) {
    mockDb.enqueue([programRow("prog-mid", "2026-09-30")]);
    mockDb.enqueue([programRow("prog-end", "2026-10-04")]);
    mockDb.enqueue([weekAssignmentRow()]);
    mockDb.enqueue([weekAssignmentRow({ title: "Discurso público" })]);
  } else {
    mockDb.enqueue([]);
    mockDb.enqueue([]);
  }
  mockDb.enqueue([]);
  mockDb.enqueue([]);
}

describe("buildPublicRangePayload (anterior + futuras)", () => {
  it("envia a semana anterior (mesmo vazia) e as futuras cadastradas", async () => {
    mockDb.enqueue([{ congregationName: "Congregación Este" }]);
    mockDb.enqueue([{ weekStart: "2026-09-28" }, { weekStart: "2026-10-05" }]);
    enqueueWeekBlock(); // anterior, sem programa
    enqueueWeekBlock({ withProgram: true }); // atual
    enqueueWeekBlock({ withProgram: true }); // futura

    const payload = await buildPublicRangePayload(new Date("2026-09-30T12:00:00Z"));

    expect(payload.congregationName).toBe("Congregación Este");
    expect(payload.weeks.map((week) => week.weekStart)).toEqual([
      "2026-09-21",
      "2026-09-28",
      "2026-10-05",
    ]);
    expect(payload.weeks.map((week) => week.weekEnd)).toEqual([
      "2026-09-27",
      "2026-10-04",
      "2026-10-11",
    ]);
    expect(payload.weeks[0]?.midweek).toBeNull();
    expect(payload.weeks[0]?.weekend).toBeNull();
    expect(payload.weeks[1]?.midweek?.assignments[0]?.personName).toBe("Ana Torres");
    expect(payload.weeks[2]?.weekend?.assignments[0]?.title).toBe("Discurso público");
    expect(mockDb.pending).toBe(0);
  });

  it("inclui a semana atual vazia quando ela ainda não tem programa", async () => {
    mockDb.enqueue([{ congregationName: "Congregación Este" }]);
    mockDb.enqueue([{ weekStart: "2026-10-05" }]);
    enqueueWeekBlock(); // anterior, sem programa
    enqueueWeekBlock(); // atual, ainda sem programa (casca vazia)
    enqueueWeekBlock({ withProgram: true }); // futura

    const payload = await buildPublicRangePayload(new Date("2026-09-30T12:00:00Z"));

    expect(payload.weeks.map((week) => week.weekStart)).toEqual([
      "2026-09-21",
      "2026-09-28",
      "2026-10-05",
    ]);
    expect(payload.weeks[1]?.midweek).toBeNull();
    expect(payload.weeks[1]?.weekend).toBeNull();
    expect(payload.weeks[2]?.midweek?.assignments[0]?.personName).toBe("Ana Torres");
    expect(mockDb.pending).toBe(0);
  });

  it("limita as futuras a 26 semanas à frente", async () => {
    const futures = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 8, 28 + index * 7));
      return { weekStart: date.toISOString().slice(0, 10) };
    });
    mockDb.enqueue([{ congregationName: "Congregación Este" }]);
    mockDb.enqueue(futures);
    for (let index = 0; index < 27; index += 1) enqueueWeekBlock();

    const payload = await buildPublicRangePayload(new Date("2026-09-30T12:00:00Z"));

    expect(payload.weeks).toHaveLength(27);
    expect(payload.weeks[0]?.weekStart).toBe("2026-09-21");
    expect(payload.weeks[26]?.weekStart).toBe(futures[25]?.weekStart);
    expect(mockDb.pending).toBe(0);
  });
});

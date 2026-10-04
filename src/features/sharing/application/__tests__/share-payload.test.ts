import { mockDb } from "@test/mock-db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPublicWeekPayload } from "@/features/sharing/application/share-payload";

vi.mock("@/shared/lib/db", async () => {
  const { mockDb } = await import("@test/mock-db");
  return { getDb: () => mockDb.database };
});

beforeEach(() => {
  mockDb.reset();
  vi.resetAllMocks();
});

describe("buildPublicWeekPayload (limpeza)", () => {
  it("inclui a limpeza confirmada da semana", async () => {
    mockDb.enqueue([{ congregationName: "Congregación Este" }]);
    mockDb.enqueue([]); // sem programa entre semana
    mockDb.enqueue([]); // sem programa de fim de semana
    mockDb.enqueue([]); // sem apoio
    mockDb.enqueue([
      {
        date: "2026-09-30",
        sectorName: "Grupo 1",
        task: "Barrer y trapear",
        personName: "Luis Gómez",
      },
      { date: "2026-10-04", sectorName: "Grupo 2", task: null, personName: "Ana Torres" },
    ]);
    const payload = await buildPublicWeekPayload(new Date("2026-09-30T12:00:00Z"));
    expect(payload.cleaning).toEqual([
      {
        date: "2026-09-30",
        sectorName: "Grupo 1",
        task: "Barrer y trapear",
        personName: "Luis Gómez",
      },
      { date: "2026-10-04", sectorName: "Grupo 2", task: "", personName: "Ana Torres" },
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

import { mockDb } from "@test/mock-db";
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { requireOwnerUser } from "@/features/auth/application/session";
import {
  createCleaningProgram,
  deleteCleaningDay,
  deleteCleaningProgram,
  updateCleaningAssignment,
  updateProgramStatus,
} from "@/features/cleaning/application/cleaning-program-actions";

vi.mock("@/shared/lib/db", async () => {
  const { mockDb } = await import("@test/mock-db");
  return { getDb: () => mockDb.database };
});

vi.mock("@/features/auth/application/session", () => ({
  getCurrentUser: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  requirePrivilegedUser: vi.fn(),
  requireOwnerUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const fakeUser = {
  id: "u1",
  email: "owner@example.com",
  name: "Owner",
  role: "owner" as const,
};

const typeRow = { key: "per_meeting", enabled: true, assignmentMode: "person" };
const sectorRow = {
  id: "s1",
  cleaningTypeKey: "per_meeting",
  key: "auditorio",
  name: "Auditorio",
  task: "Barrer",
  enabled: true,
  peopleCount: 1,
  requiredSex: "any",
  allowYoung: true,
  isDefault: true,
  sortOrder: 0,
};
const personRow = {
  id: "p1",
  firstName: "Ana",
  lastName: "Pérez",
  sex: "female",
  cleaning: true,
  young: false,
  familyHead: false,
  familyMemberId: null,
};
const settingsRow = { id: "global", midweekDay: 2, weekendDay: 0 };

const createProgramReads: unknown[] = [
  [typeRow],
  [sectorRow],
  [personRow],
  [],
  [settingsRow],
  [],
  [],
  [],
  [],
];

function rejected(reason: unknown): Promise<unknown> {
  return Promise.resolve().then(() => {
    throw reason;
  });
}

function callsOf(fn: string) {
  return mockDb.calls.filter((call) => call.fn === fn);
}

let consoleError: MockInstance;

beforeEach(() => {
  mockDb.reset();
  vi.mocked(requireOwnerUser).mockReset();
  vi.mocked(revalidatePath).mockReset();
  vi.mocked(requireOwnerUser).mockResolvedValue(fakeUser);
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("createCleaningProgram", () => {
  it("rechaza sin días seleccionados antes de pedir permiso", async () => {
    const result = await createCleaningProgram("per_meeting", []);

    expect(result).toEqual({ ok: false, error: "Selecciona al menos un día." });
    expect(vi.mocked(requireOwnerUser)).not.toHaveBeenCalled();
  });

  it("rechaza una fecha con formato inválido", async () => {
    const result = await createCleaningProgram("per_meeting", ["01/09/2026"]);

    expect(result).toEqual({ ok: false, error: "Fecha no válida (usa AAAA-MM-DD)." });
  });

  it("rechaza un tipo de limpieza desconocido", async () => {
    const result = await createCleaningProgram("otro", ["2026-09-01"]);

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(vi.mocked(requireOwnerUser)).not.toHaveBeenCalled();
  });

  it("exige ser owner", async () => {
    vi.mocked(requireOwnerUser).mockRejectedValueOnce(new Error("FORBIDDEN"));

    await expect(createCleaningProgram("per_meeting", ["2026-09-01"])).rejects.toThrow("FORBIDDEN");
    expect(mockDb.calls).toHaveLength(0);
  });

  it("rechaza dos días en la misma semana para limpieza semanal", async () => {
    const result = await createCleaningProgram("weekly", ["2026-09-01", "2026-09-03"]);

    expect(result).toEqual({
      ok: false,
      error: "Semana de 2026-09-01: no es posible programar más de un día para limpieza semanal.",
    });
    expect(mockDb.calls).toHaveLength(0);
  });

  it("rechaza un período mayor que el máximo permitido", async () => {
    const result = await createCleaningProgram("per_meeting", ["2026-01-01", "2027-06-01"]);

    expect(result).toEqual({ ok: false, error: "Período máximo de 366 días por programa." });
    expect(mockDb.calls).toHaveLength(0);
  });

  it("rechaza un tipo desactivado", async () => {
    mockDb.enqueue([{ ...typeRow, enabled: false }]);

    const result = await createCleaningProgram("per_meeting", ["2026-09-01"]);

    expect(result).toEqual({
      ok: false,
      error: "Tipo de limpieza no encontrado o desactivado.",
    });
  });

  it("rechaza un tipo sin sectores activos", async () => {
    mockDb.enqueueMany([[typeRow], []]);

    const result = await createCleaningProgram("per_meeting", ["2026-09-01"]);

    expect(result).toEqual({
      ok: false,
      error: "Ningún sector activo para este tipo de limpieza.",
    });
  });

  it("rechaza un período que se solapa con otro programa", async () => {
    mockDb.enqueueMany([
      [typeRow],
      [sectorRow],
      [],
      [{ id: "pg0", startDate: "2026-08-30", endDate: "2026-09-07" }],
    ]);

    const result = await createCleaningProgram("per_meeting", ["2026-09-01"]);

    expect(result).toEqual({
      ok: false,
      error:
        "Ya fue creada tabla para aquella semana (2026-08-30 — 2026-09-07). Elige otro período o edita la tabla existente.",
    });
  });

  it("crea el programa con sus designaciones", async () => {
    mockDb.enqueueMany([...createProgramReads, [], []]);

    const result = await createCleaningProgram("per_meeting", ["2026-09-01"]);

    expect(result.ok).toBe(true);
    expect(result.programId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.assignmentCount).toBe(1);
    expect(result.messages).toEqual([]);
    expect(mockDb.pending).toBe(0);

    const valuesArgs = callsOf("values").map((call) => call.args[0]);
    const programValues = valuesArgs.find(
      (value) => typeof value === "object" && value !== null && !Array.isArray(value),
    );
    expect(programValues).toMatchObject({
      typeKey: "per_meeting",
      startDate: "2026-09-01",
      endDate: "2026-09-01",
      status: "draft",
      createdBy: fakeUser.id,
    });
    const assignmentValues = valuesArgs.find((value): value is unknown[] => Array.isArray(value));
    expect(assignmentValues).toHaveLength(1);
    expect(assignmentValues?.[0]).toMatchObject({
      programId: result.programId,
      assignmentDate: "2026-09-01",
      sectorKey: "auditorio",
      personId: "p1",
      personName: "Ana Pérez",
      isFamily: false,
    });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/designacoes");
  });

  it("revierte el programa cuando falla el guardado", async () => {
    mockDb.enqueueMany([...createProgramReads, [], rejected(new Error("insert falló")), [], []]);

    const result = await createCleaningProgram("per_meeting", ["2026-09-01"]);

    expect(result).toEqual({
      ok: false,
      error: "No se pudo guardar el programa. Inténtalo de nuevo.",
    });
    expect(callsOf("delete")).toHaveLength(2);
    expect(mockDb.pending).toBe(0);
    expect(consoleError).toHaveBeenCalledWith(
      "[cleaning] falha ao criar programa, revertendo",
      expect.objectContaining({ error: expect.any(Error) }),
    );
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });
});

describe("updateCleaningAssignment", () => {
  const assignmentRow = {
    id: "a1",
    programId: "pg1",
    assignmentDate: "2026-09-01",
    sectorKey: "auditorio",
    sectorName: "Auditorio",
    personId: "old",
    personName: "Old persona",
    isFamily: false,
    sortOrder: 0,
    createdAt: new Date("2026-09-01T10:00:00Z"),
  };
  const programRow = {
    id: "pg1",
    typeKey: "per_meeting",
    startDate: "2026-09-01",
    endDate: "2026-09-01",
    status: "draft",
    createdBy: "u1",
    createdAt: new Date("2026-09-01T10:00:00Z"),
    updatedAt: new Date("2026-09-01T10:00:00Z"),
  };

  it("rechaza el id de designación vacío", async () => {
    const result = await updateCleaningAssignment("", "p1");

    expect(result).toEqual({ ok: false, error: "ID no válido." });
    expect(mockDb.calls).toHaveLength(0);
  });

  it("rechaza el id de persona vacío", async () => {
    const result = await updateCleaningAssignment("a1", "");

    expect(result).toEqual({ ok: false, error: "Persona no válida." });
    expect(mockDb.calls).toHaveLength(0);
  });

  it("rechaza una designación inexistente", async () => {
    mockDb.enqueue([]);

    const result = await updateCleaningAssignment("a1", "p1");

    expect(result).toEqual({ ok: false, error: "Designación no encontrada." });
  });

  it("rechaza una persona inexistente", async () => {
    mockDb.enqueueMany([[assignmentRow], []]);

    const result = await updateCleaningAssignment("a1", "p9");

    expect(result).toEqual({ ok: false, error: "Persona no encontrada." });
  });

  it("rechaza una persona sin limpieza habilitada", async () => {
    mockDb.enqueueMany([[assignmentRow], [{ ...personRow, cleaning: false }]]);

    const result = await updateCleaningAssignment("a1", "p1");

    expect(result).toEqual({ ok: false, error: "La persona no está habilitada para limpieza." });
  });

  it("rechaza una persona de sexo que no cumple el sector", async () => {
    mockDb.enqueueMany([
      [{ ...assignmentRow, sectorKey: "banheiro_masculino" }],
      [personRow],
      [programRow],
      [{ id: "s2", key: "banheiro_masculino", requiredSex: "male", allowYoung: false }],
    ]);

    const result = await updateCleaningAssignment("a1", "p1");

    expect(result).toEqual({ ok: false, error: "Este sector exige hermano (masculino)." });
  });

  it("rechaza a un joven en sector solo-adulto", async () => {
    mockDb.enqueueMany([
      [assignmentRow],
      [{ ...personRow, sex: "male", young: true }],
      [programRow],
      [{ id: "s1", key: "auditorio", requiredSex: "any", allowYoung: false }],
    ]);

    const result = await updateCleaningAssignment("a1", "p1");

    expect(result).toEqual({ ok: false, error: "Este sector exige adulto (joven no permitido)." });
  });

  it("actualiza la designación con la persona válida", async () => {
    mockDb.enqueueMany([
      [assignmentRow],
      [personRow],
      [programRow],
      [{ id: "s1", key: "auditorio", requiredSex: "any", allowYoung: true }],
      [],
    ]);

    const result = await updateCleaningAssignment("a1", "p1");

    expect(result).toEqual({ ok: true });
    const setData = callsOf("set")[0].args[0] as Record<string, unknown>;
    expect(setData).toMatchObject({
      personId: "p1",
      personName: "Ana Pérez",
      isFamily: false,
    });
    expect(callsOf("where")).toHaveLength(5);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/designacoes");
  });

  it("devuelve error cuando la base falla", async () => {
    mockDb.enqueue(rejected(new Error("timeout")));

    const result = await updateCleaningAssignment("a1", "p1");

    expect(result).toEqual({ ok: false, error: "No se pudo actualizar. Inténtalo de nuevo." });
    expect(consoleError).toHaveBeenCalledWith(
      "[cleaning] falha ao trocar designação",
      expect.objectContaining({ assignmentId: "a1" }),
    );
  });
});

describe("deleteCleaningDay", () => {
  it("rechaza una fecha inválida", async () => {
    const result = await deleteCleaningDay("pg1", "ayer");

    expect(result).toEqual({ ok: false, error: "Fecha no válida." });
    expect(mockDb.calls).toHaveLength(0);
  });

  it("rechaza un programa inexistente", async () => {
    mockDb.enqueue([]);

    const result = await deleteCleaningDay("pg9", "2026-09-01");

    expect(result).toEqual({ ok: false, error: "Programa no encontrado." });
    expect(callsOf("delete")).toHaveLength(0);
  });

  it("elimina las designaciones del día", async () => {
    mockDb.enqueueMany([
      [
        {
          id: "pg1",
          typeKey: "per_meeting",
          startDate: "2026-09-01",
          endDate: "2026-09-01",
          status: "draft",
        },
      ],
      [],
    ]);

    const result = await deleteCleaningDay("pg1", "2026-09-01");

    expect(result).toEqual({ ok: true });
    expect(callsOf("delete")).toHaveLength(1);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/designacoes");
  });

  it("devuelve error cuando la base falla", async () => {
    mockDb.enqueue(rejected(new Error("timeout")));

    const result = await deleteCleaningDay("pg1", "2026-09-01");

    expect(result).toEqual({ ok: false, error: "No se pudo eliminar el día. Inténtalo de nuevo." });
  });
});

describe("deleteCleaningProgram", () => {
  it("rechaza el id vacío", async () => {
    const result = await deleteCleaningProgram(" ");

    expect(result).toEqual({ ok: false, error: "ID no válido." });
    expect(mockDb.calls).toHaveLength(0);
  });

  it("elimina las designaciones y el programa", async () => {
    mockDb.enqueueMany([[], []]);

    const result = await deleteCleaningProgram("pg1");

    expect(result).toEqual({ ok: true });
    expect(callsOf("delete")).toHaveLength(2);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/designacoes");
  });
});

describe("updateProgramStatus", () => {
  it("rechaza el id vacío", async () => {
    const result = await updateProgramStatus("", "confirmed");

    expect(result).toEqual({ ok: false, error: "ID no válido." });
    expect(mockDb.calls).toHaveLength(0);
  });

  it("actualiza el estado del programa", async () => {
    mockDb.enqueue([]);

    const result = await updateProgramStatus("pg1", "confirmed");

    expect(result).toEqual({ ok: true });
    const setData = callsOf("set")[0].args[0] as Record<string, unknown>;
    expect(setData).toMatchObject({ status: "confirmed" });
    expect(setData.updatedAt).toBeInstanceOf(Date);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/designacoes");
  });
});

import { mockDb, rejected } from "@test/mock-db";
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requirePrivilegedUser } from "@/features/auth/application/session";
import type { AuthUser } from "@/features/auth/domain/user";
import {
  deleteDutyProgram,
  generateDutyRoster,
  saveDutyProgram,
  updateDutyAssignment,
  updateDutyProgramStatus,
} from "@/features/meeting-duties/application/duty-actions";

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
  revalidateTag: vi.fn(),
}));

const user: AuthUser = { id: "user-1", email: "a@b.c", name: "Prueba", image: null, role: "admin" };

const DUTY_TABLES_MISSING_ERROR =
  "Tablas de designaciones no creadas en la base de datos. Ejecuta `npm run db:push` y recarga la página.";

const CONNECTION_ERROR = "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";

function rejection(message: string): unknown {
  return rejected(new Error(message));
}

function scheduleRow() {
  return {
    congregationName: "Primera",
    midweekDay: 3,
    midweekTime: "19:30",
    weekendDay: 6,
    weekendTime: "10:00",
  };
}

function setPayloads(): Record<string, unknown>[] {
  return mockDb.calls
    .filter((call) => call.fn === "set")
    .map((call) => call.args[0] as Record<string, unknown>);
}

function valuePayloads(): Record<string, unknown>[] {
  return mockDb.calls
    .filter((call) => call.fn === "values")
    .map((call) => call.args[0] as Record<string, unknown>);
}

function personRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    firstName: "Juan",
    lastName: "Pérez",
    sex: "male",
    usher: true,
    sound: false,
    video: false,
    microphone: true,
    platform: false,
    ...overrides,
  };
}

function meetingProgramRow(id: string, kind: string, date: string) {
  return {
    id,
    kind,
    weekStart: "2026-09-21",
    date,
    outlineId: null,
    createdBy: "user-1",
    status: "draft",
    exceptionType: "",
    exceptionLabel: "",
    createdAt: new Date("2026-09-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T00:00:00Z"),
  };
}

function meetingAssignmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ma-1",
    programId: "mp-1",
    partKey: "talk",
    section: "",
    title: "Parte",
    subtitle: "",
    startTime: "",
    durationMinutes: 10,
    personId: null,
    personName: "",
    helperPersonId: null,
    helperPersonName: "",
    songNumber: null,
    songTheme: "",
    classroom: "A",
    study: "",
    source: "",
    notes: "",
    speakerCongregation: "",
    sortOrder: 0,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  mockDb.reset();
  vi.clearAllMocks();
  vi.mocked(requirePrivilegedUser).mockResolvedValue(user);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("saveDutyProgram", () => {
  it("exige privilegios y al menos un día", async () => {
    await expect(saveDutyProgram([])).resolves.toEqual({
      ok: false,
      error: "Selecciona al menos un día.",
    });
    expect(requirePrivilegedUser).toHaveBeenCalledTimes(1);
    expect(mockDb.calls).toEqual([]);
  });

  it("informa error de conexión cuando no se pueden leer las personas", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(
      saveDutyProgram([{ date: "2026-09-23", kind: "midweek", slots: [] }]),
    ).resolves.toEqual({ ok: false, error: CONNECTION_ERROR });
  });

  it("rechaza personas que no existen", async () => {
    mockDb.enqueue([{ id: "p1", firstName: "Juan", lastName: "Pérez" }]);
    await expect(
      saveDutyProgram([
        {
          date: "2026-09-23",
          kind: "midweek",
          slots: [
            {
              dutyKey: "usher",
              postLabel: "A",
              side: "interno",
              personId: "p9",
              isManual: false,
            },
          ],
        },
      ]),
    ).resolves.toEqual({ ok: false, error: "Hay una persona inválida en la escala." });
    expect(mockDb.pending).toBe(0);
  });

  it("rechaza fechas que ya tienen escala", async () => {
    mockDb.enqueueMany([
      [{ id: "p1", firstName: "Juan", lastName: "Pérez" }],
      [{ date: "2026-09-27" }],
    ]);
    await expect(
      saveDutyProgram([
        {
          date: "2026-09-27",
          kind: "weekend",
          slots: [
            { dutyKey: "usher", postLabel: "A", side: null, personId: "p1", isManual: false },
          ],
        },
      ]),
    ).resolves.toEqual({
      ok: false,
      error:
        "Esa fecha ya tiene escala creada (2026-09-27). Abre la escala existente en vez de crear otra.",
    });
    expect(mockDb.pending).toBe(0);
  });

  it("guarda el programa con las designaciones ordenadas por fecha", async () => {
    mockDb.enqueueMany([
      [
        { id: "p1", firstName: "Juan", lastName: "Pérez" },
        { id: "p2", firstName: "Ana", lastName: "García" },
      ],
      [],
      [],
      [],
      [],
    ]);
    const result = await saveDutyProgram([
      {
        date: "2026-09-27",
        kind: "weekend",
        slots: [
          { dutyKey: "usher", postLabel: "B", side: "externo", personId: "p2", isManual: true },
        ],
      },
      {
        date: "2026-09-23",
        kind: "midweek",
        slots: [
          { dutyKey: "usher", postLabel: "A", side: "interno", personId: "p1", isManual: false },
          { dutyKey: "sound", postLabel: "Som", side: null, personId: null, isManual: false },
        ],
      },
    ]);
    expect(result.ok).toBe(true);
    expect(result.programId).toEqual(expect.any(String));
    expect(result.assignmentCount).toBe(3);
    expect(valuePayloads()[0]).toMatchObject({
      id: result.programId,
      startDate: "2026-09-23",
      endDate: "2026-09-27",
      status: "draft",
      createdBy: "user-1",
    });
    expect(valuePayloads().slice(1)).toEqual([
      expect.objectContaining({
        assignmentDate: "2026-09-23",
        personId: "p1",
        personName: "Juan Pérez",
        sortOrder: 1,
      }),
      expect.objectContaining({
        assignmentDate: "2026-09-23",
        personId: null,
        personName: "",
        sortOrder: 2,
      }),
      expect.objectContaining({
        assignmentDate: "2026-09-27",
        personId: "p2",
        personName: "Ana García",
        sortOrder: 3,
      }),
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/designacoes");
    expect(mockDb.pending).toBe(0);
  });

  it("informa de tablas faltantes al guardar", async () => {
    mockDb.enqueueMany([
      [{ id: "p1", firstName: "Juan", lastName: "Pérez" }],
      [],
      rejection("duty_programs does not exist"),
    ]);
    await expect(
      saveDutyProgram([
        {
          date: "2026-09-23",
          kind: "midweek",
          slots: [
            { dutyKey: "usher", postLabel: "A", side: null, personId: "p1", isManual: false },
          ],
        },
      ]),
    ).resolves.toEqual({ ok: false, error: DUTY_TABLES_MISSING_ERROR });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("informa error genérico cuando falla el guardado", async () => {
    mockDb.enqueueMany([
      [{ id: "p1", firstName: "Juan", lastName: "Pérez" }],
      [],
      rejection("fallo transitorio"),
    ]);
    await expect(
      saveDutyProgram([
        {
          date: "2026-09-23",
          kind: "midweek",
          slots: [
            { dutyKey: "usher", postLabel: "A", side: null, personId: "p1", isManual: false },
          ],
        },
      ]),
    ).resolves.toEqual({ ok: false, error: CONNECTION_ERROR });
  });
});

describe("updateDutyAssignment", () => {
  it("limpia la designación cuando la persona es null", async () => {
    mockDb.enqueue([]);
    await expect(updateDutyAssignment("da-1", null)).resolves.toEqual({ ok: true });
    expect(setPayloads()[0]).toEqual({
      personId: null,
      personName: "",
      isManual: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/designacoes");
    expect(mockDb.pending).toBe(0);
  });

  it("asigna una persona existente con su nombre", async () => {
    mockDb.enqueueMany([[{ id: "p1", firstName: " Juan", lastName: "Pérez " }], []]);
    await expect(updateDutyAssignment("da-1", "p1")).resolves.toEqual({ ok: true });
    expect(setPayloads()[0]).toEqual({
      personId: "p1",
      personName: "Juan Pérez",
      isManual: true,
    });
    expect(mockDb.pending).toBe(0);
  });

  it("devuelve error cuando la persona no existe", async () => {
    mockDb.enqueue([]);
    await expect(updateDutyAssignment("da-1", "p9")).resolves.toEqual({
      ok: false,
      error: "Persona no encontrada.",
    });
    expect(setPayloads()).toEqual([]);
  });

  it("informa de tablas faltantes", async () => {
    mockDb.enqueue(rejection("duty_assignments does not exist"));
    await expect(updateDutyAssignment("da-1", null)).resolves.toEqual({
      ok: false,
      error: DUTY_TABLES_MISSING_ERROR,
    });
  });

  it("informa error genérico cuando falla la base", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(updateDutyAssignment("da-1", null)).resolves.toEqual({
      ok: false,
      error: CONNECTION_ERROR,
    });
  });
});

describe("deleteDutyProgram", () => {
  it("borra el programa y revalida", async () => {
    mockDb.enqueue([]);
    await expect(deleteDutyProgram("dp-1")).resolves.toEqual({ ok: true });
    expect(mockDb.calls.map((call) => call.fn)).toEqual(["delete", "where"]);
    expect(revalidatePath).toHaveBeenCalledWith("/designacoes");
    expect(mockDb.pending).toBe(0);
  });

  it("informa de tablas faltantes", async () => {
    mockDb.enqueue(rejection("duty_programs does not exist"));
    await expect(deleteDutyProgram("dp-1")).resolves.toEqual({
      ok: false,
      error: DUTY_TABLES_MISSING_ERROR,
    });
  });

  it("informa error genérico cuando falla la base", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(deleteDutyProgram("dp-1")).resolves.toEqual({
      ok: false,
      error: "No se pudo eliminar. Inténtalo de nuevo.",
    });
  });
});

describe("updateDutyProgramStatus", () => {
  it("actualiza el estado del programa", async () => {
    mockDb.enqueue([]);
    await expect(updateDutyProgramStatus("dp-1", "confirmed")).resolves.toEqual({ ok: true });
    expect(setPayloads()[0]).toEqual({ status: "confirmed" });
    expect(revalidatePath).toHaveBeenCalledWith("/designacoes");
    expect(mockDb.pending).toBe(0);
  });

  it("informa de tablas faltantes", async () => {
    mockDb.enqueue(rejection("duty_programs does not exist"));
    await expect(updateDutyProgramStatus("dp-1", "archived")).resolves.toEqual({
      ok: false,
      error: DUTY_TABLES_MISSING_ERROR,
    });
  });

  it("informa error genérico cuando falla la base", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(updateDutyProgramStatus("dp-1", "archived")).resolves.toEqual({
      ok: false,
      error: CONNECTION_ERROR,
    });
  });
});

describe("generateDutyRoster", () => {
  it("exige privilegios y fechas coherentes", async () => {
    await expect(generateDutyRoster("", "")).resolves.toEqual({
      ok: false,
      error: "Indica las fechas inicial y final.",
    });
    await expect(generateDutyRoster("2026-09-27", "2026-09-21")).resolves.toEqual({
      ok: false,
      error: "La fecha inicial debe ser anterior a la fecha final.",
    });
    expect(requirePrivilegedUser).toHaveBeenCalledTimes(2);
    expect(mockDb.calls).toEqual([]);
  });

  it("informa cuando el período no tiene días de reunión", async () => {
    mockDb.enqueueMany([[scheduleRow()], [], [], [], [], [], []]);
    await expect(generateDutyRoster("2026-09-21", "2026-09-22")).resolves.toEqual({
      ok: false,
      error: "No hay días de reunión en el período elegido.",
    });
    expect(mockDb.pending).toBe(0);
  });

  it("genera el rascunho con conflictos del programa y sorteo justo", async () => {
    mockDb.enqueueMany([
      [scheduleRow()],
      [],
      [],
      [
        {
          id: "sec-usher",
          key: null,
          name: "Acomodadores",
          personFlag: "usher",
          enabled: true,
          peopleCount: 1,
          isDefault: false,
          sortOrder: 0,
        },
        {
          id: "sec-mic",
          key: null,
          name: "Microfonía",
          personFlag: "microphone",
          enabled: true,
          peopleCount: 1,
          isDefault: false,
          sortOrder: 1,
        },
      ],
      [
        { id: "slot-1", sectorId: "sec-usher", label: "A", sortOrder: 0 },
        { id: "slot-2", sectorId: "sec-mic", label: "Principal", sortOrder: 0 },
      ],
      [
        personRow({ id: "p1", firstName: "Pedro", lastName: "Presidente", sound: false }),
        personRow({ id: "p2", firstName: "Pablo", lastName: "Estudio", sound: true }),
      ],
      [{ personId: "p2", date: "2026-09-01" }],
      [meetingProgramRow("mp-mid", "midweek", "2026-09-23")],
      [meetingProgramRow("mp-end", "weekend", "2026-09-26")],
      [
        meetingAssignmentRow({
          id: "ma-pres",
          programId: "mp-mid",
          partKey: "president",
          personId: "p1",
          personName: "Pedro Presidente",
        }),
        meetingAssignmentRow({
          id: "ma-study",
          programId: "mp-mid",
          partKey: "congregation-study",
          personId: "p2",
          personName: "Pablo Estudio",
        }),
      ],
      [
        meetingAssignmentRow({
          id: "ma-wt",
          programId: "mp-end",
          partKey: "watchtower-study",
          personId: "p2",
          personName: "Pablo Estudio",
        }),
      ],
    ]);
    const result = await generateDutyRoster("2026-09-21", "2026-09-26");
    expect(result.ok).toBe(true);
    expect(result.programMissingDates).toEqual([]);
    const draft = result.draft ?? [];
    expect(draft).toHaveLength(2);

    const [midweek, weekend] = draft;
    expect(midweek?.programConflictNames).toEqual(["Pedro Presidente", "Pablo Estudio"]);
    expect(midweek?.slots.map((slot) => [slot.dutyKey, slot.personId])).toEqual([
      ["usher", "p2"],
      ["microphone", null],
    ]);
    expect(midweek?.slots[0]?.conflictIds).toEqual(["p1"]);
    expect(midweek?.slots[1]?.conflictIds).toEqual(["p2", "p1"]);
    expect(midweek?.slots[0]?.candidates.map((candidate) => candidate.id)).toEqual(["p2", "p1"]);
    expect(midweek?.slots[0]?.dutyName).toBe("Acomodadores");
    expect(midweek?.slots[0]?.postLabel).toBe("A");
    expect(midweek?.slots[0]?.side).toBe("interno");

    expect(weekend?.programConflictNames).toEqual(["Pablo Estudio"]);
    expect(weekend?.slots.map((slot) => [slot.dutyKey, slot.personId])).toEqual([
      ["usher", "p1"],
      ["microphone", "p1"],
    ]);
    expect(weekend?.slots[0]?.conflictIds).toEqual([]);
    expect(weekend?.slots[1]?.conflictIds).toEqual(["p2"]);
    expect(mockDb.pending).toBe(0);
  });

  it("lista las fechas sin programa en la semana", async () => {
    mockDb.enqueueMany([[scheduleRow()], [], [], [], [], [], [], [], []]);
    const result = await generateDutyRoster("2026-09-21", "2026-09-26");
    expect(result.ok).toBe(true);
    expect(result.programMissingDates).toEqual(["2026-09-23", "2026-09-26"]);
    const draft = result.draft ?? [];
    expect(draft).toHaveLength(2);
    expect(draft[0]?.programConflictNames).toEqual([]);
    expect(mockDb.pending).toBe(0);
  });
});

import { mockDb, rejected } from "@test/mock-db";
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requirePrivilegedUser } from "@/features/auth/application/session";
import type { AuthUser } from "@/features/auth/domain/user";
import {
  saveMeetingProgram,
  saveStagedChanges,
  updateMeetingAssignment,
  updateMeetingAssignmentDetails,
  updateMeetingException,
  updateMeetingSong,
} from "@/features/meetings/application/meeting-actions";
import type { MeetingKind } from "@/features/meetings/infrastructure/meeting-schema";
import { es } from "@/shared/i18n/es";

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

const MEETING_TABLES_MISSING_ERROR =
  "Tablas de reuniones no creadas en la base de datos. Ejecuta `npm run db:push` y recarga la página.";

function rejection(message: string): unknown {
  return rejected(new Error(message));
}

function scheduleRow() {
  return {
    congregationName: "",
    midweekDay: 2,
    midweekTime: "19:30",
    weekendDay: 0,
    weekendTime: "10:00",
  };
}

function assemblyEventRow() {
  return {
    id: "evt-1",
    type: "regional_assembly",
    title: "Asamblea Regional",
    startDate: "2026-09-26",
    endDate: "2026-09-28",
    startTime: "09:00",
    notes: null,
    speakerName: null,
    midweekTheme: null,
    publicTalkTheme: null,
    finalTalkTheme: null,
  };
}

function programRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "prog-1",
    kind: "midweek",
    weekStart: "2026-09-21",
    date: "2026-09-23",
    outlineId: null,
    createdBy: "user-1",
    status: "draft",
    exceptionType: "",
    exceptionLabel: "",
    createdAt: new Date("2026-09-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  };
}

function assignmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "asg-1",
    programId: "prog-1",
    partKey: "talk",
    section: "",
    title: "Discurso",
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

type MeetingPart = Parameters<typeof saveMeetingProgram>[3][number];

function part(overrides: Partial<MeetingPart> = {}): MeetingPart {
  return {
    partKey: "president",
    title: "Presidencia",
    durationMinutes: 5,
    section: "",
    subtitle: "",
    startTime: "",
    songTheme: "",
    classroom: "A",
    study: "",
    source: "",
    notes: "",
    speakerCongregation: "",
    ...overrides,
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

beforeEach(() => {
  mockDb.reset();
  vi.clearAllMocks();
  vi.mocked(requirePrivilegedUser).mockResolvedValue(user);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("saveMeetingProgram", () => {
  it("rechaza datos de semana inválidos sin tocar la base", async () => {
    const result = await saveMeetingProgram("noche" as MeetingKind, "21-09-2026", "2026-09-23", [
      part(),
    ]);
    expect(result).toEqual({ ok: false, error: "Datos de la semana no válidos." });
    expect(requirePrivilegedUser).not.toHaveBeenCalled();
    expect(mockDb.calls).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rechaza partes inválidas", async () => {
    const tooMany = Array.from({ length: 61 }, (_, index) =>
      part({ partKey: `p${index}`, durationMinutes: 0 }),
    );
    await expect(
      saveMeetingProgram("midweek", "2026-09-21", "2026-09-23", tooMany),
    ).resolves.toEqual({ ok: false, error: "Partes no válidas." });
    await expect(
      saveMeetingProgram("midweek", "2026-09-21", "2026-09-23", [part({ partKey: "" })]),
    ).resolves.toEqual({ ok: false, error: "Partes no válidas." });
    expect(requirePrivilegedUser).not.toHaveBeenCalled();
  });

  it("rechaza excepción inválida", async () => {
    await expect(
      saveMeetingProgram("midweek", "2026-09-21", "2026-09-23", [part()], null, {
        exceptionType: "otra" as "",
        exceptionLabel: "",
      }),
    ).resolves.toEqual({ ok: false, error: "Excepción no válida." });
    expect(requirePrivilegedUser).not.toHaveBeenCalled();
  });

  it("propaga el error de autenticación", async () => {
    vi.mocked(requirePrivilegedUser).mockRejectedValue(new Error("FORBIDDEN"));
    await expect(
      saveMeetingProgram("midweek", "2026-09-21", "2026-09-23", [part()]),
    ).rejects.toThrow("FORBIDDEN");
    expect(mockDb.calls).toEqual([]);
  });

  it("crea un programa nuevo con sus partes", async () => {
    mockDb.enqueueMany([[scheduleRow()], [], [], [], [], []]);
    const result = await saveMeetingProgram(
      "midweek",
      "2026-09-21",
      "2026-09-23",
      [part()],
      "outline-9",
      { exceptionType: "special", exceptionLabel: "Reunión especial" },
    );
    expect(result.ok).toBe(true);
    expect(result.programId).toEqual(expect.any(String));
    expect(result.programId).toHaveLength(36);
    expect(valuePayloads()[0]).toEqual({
      id: result.programId,
      kind: "midweek",
      weekStart: "2026-09-21",
      date: "2026-09-23",
      outlineId: "outline-9",
      exceptionType: "special",
      exceptionLabel: "Reunión especial",
      status: "draft",
      createdBy: "user-1",
    });
    expect(valuePayloads()[1]).toMatchObject({
      programId: result.programId,
      partKey: "president",
      sortOrder: 0,
      songNumber: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/reunioes");
    expect(mockDb.pending).toBe(0);
  });

  it("actualiza el programa existente y hace upsert por partKey", async () => {
    mockDb.enqueueMany([
      [scheduleRow()],
      [],
      [programRow()],
      [],
      [
        assignmentRow({ id: "kept", partKey: "president", songNumber: 42, songTheme: "Guardado" }),
        assignmentRow({ id: "stale", partKey: "removed" }),
      ],
      [],
      [],
      [],
    ]);
    const result = await saveMeetingProgram("midweek", "2026-09-21", "2026-09-25", [
      part({ songNumber: null, songTheme: "" }),
      part({
        partKey: "song-watch",
        title: "Estudio de la Atalaya",
        durationMinutes: 30,
        songNumber: 77,
      }),
    ]);
    expect(result).toEqual({ ok: true, programId: "prog-1" });
    expect(setPayloads()[0]).toMatchObject({
      date: "2026-09-25",
      exceptionType: "",
      exceptionLabel: "",
    });
    expect(mockDb.calls.filter((call) => call.fn === "delete")).toHaveLength(1);
    expect(setPayloads()[1]).toMatchObject({
      songNumber: 42,
      songTheme: "Guardado",
      sortOrder: 0,
    });
    expect(valuePayloads()[0]).toMatchObject({
      partKey: "song-watch",
      songNumber: 77,
      sortOrder: 1,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/reunioes");
    expect(mockDb.pending).toBe(0);
  });

  it("informa de tablas faltantes al buscar el programa", async () => {
    mockDb.enqueueMany([
      [scheduleRow()],
      [],
      rejection('relation "meeting_programs" does not exist'),
    ]);
    await expect(
      saveMeetingProgram("midweek", "2026-09-21", "2026-09-23", [part()]),
    ).resolves.toEqual({ ok: false, error: MEETING_TABLES_MISSING_ERROR });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("informa de tablas faltantes al guardar", async () => {
    mockDb.enqueueMany([[scheduleRow()], [], [], rejection("meeting_assignments does not exist")]);
    await expect(
      saveMeetingProgram("midweek", "2026-09-21", "2026-09-23", [part()]),
    ).resolves.toEqual({ ok: false, error: MEETING_TABLES_MISSING_ERROR });
  });

  it("informa error genérico cuando falla la búsqueda", async () => {
    mockDb.enqueueMany([[scheduleRow()], [], rejection("fallo transitorio")]);
    await expect(
      saveMeetingProgram("midweek", "2026-09-21", "2026-09-23", [part()]),
    ).resolves.toEqual({ ok: false, error: "No se pudo guardar el programa." });
  });

  it("bloquea guardar en semana de asamblea", async () => {
    mockDb.enqueueMany([[scheduleRow()], [assemblyEventRow()]]);
    const result = await saveMeetingProgram("midweek", "2026-09-21", "2026-09-23", [part()]);
    expect(result).toEqual({ ok: false, error: es.eventBlockedSave });
    expect(mockDb.calls.some((call) => call.fn === "insert")).toBe(false);
    expect(mockDb.pending).toBe(0);
  });
});

describe("updateMeetingAssignment", () => {
  it("rechaza datos inválidos después de la autenticación", async () => {
    const result = await updateMeetingAssignment("", "p1");
    expect(result).toEqual({ ok: false, error: "Datos no válidos." });
    expect(requirePrivilegedUser).toHaveBeenCalledTimes(1);
    expect(mockDb.calls).toEqual([]);
  });

  it("devuelve error cuando la parte no existe", async () => {
    mockDb.enqueue([]);
    await expect(updateMeetingAssignment("asg-1", "p1")).resolves.toEqual({
      ok: false,
      error: "Parte no encontrada.",
    });
  });

  it("asigna persona y ayudante con nombre completo y registra el histórico", async () => {
    mockDb.enqueueMany([
      [assignmentRow()],
      [{ id: "p1", firstName: "Juan", lastName: "Pérez" }],
      [{ id: "p2", firstName: "Ana", lastName: "García" }],
      [],
      [],
      [],
    ]);
    await expect(updateMeetingAssignment("asg-1", "p1", "p2")).resolves.toEqual({ ok: true });
    expect(setPayloads()[0]).toEqual({
      personId: "p1",
      personName: "Juan Pérez",
      helperPersonId: "p2",
      helperPersonName: "Ana García",
    });
    const historySets = setPayloads().slice(1);
    expect(historySets).toHaveLength(2);
    for (const payload of historySets) {
      expect(payload.lastAssignmentAt).toBeInstanceOf(Date);
    }
    expect(revalidatePath).toHaveBeenCalledWith("/reunioes");
    expect(mockDb.pending).toBe(0);
  });

  it("limpia el ayudante cuando se envía null", async () => {
    mockDb.enqueueMany([
      [assignmentRow()],
      [{ id: "p1", firstName: "Juan", lastName: "Pérez" }],
      [],
      [],
    ]);
    await expect(updateMeetingAssignment("asg-1", "p1", null)).resolves.toEqual({ ok: true });
    expect(setPayloads()[0]).toMatchObject({ helperPersonId: null, helperPersonName: "" });
    expect(setPayloads().slice(1)).toHaveLength(1);
    expect(mockDb.pending).toBe(0);
  });

  it("permite designación vacía sin consultar personas", async () => {
    mockDb.enqueue([assignmentRow()]);
    await expect(updateMeetingAssignment("asg-1", null)).resolves.toEqual({ ok: true });
    expect(setPayloads()[0]).toEqual({
      personId: null,
      personName: "",
      helperPersonId: null,
      helperPersonName: "",
    });
    expect(mockDb.calls.filter((call) => call.fn === "select")).toHaveLength(1);
    expect(mockDb.pending).toBe(0);
  });

  it("devuelve error cuando la persona no existe", async () => {
    mockDb.enqueueMany([[assignmentRow()], []]);
    await expect(updateMeetingAssignment("asg-1", "p9")).resolves.toEqual({
      ok: false,
      error: "Persona no encontrada.",
    });
  });

  it("devuelve error cuando el ayudante no existe", async () => {
    mockDb.enqueueMany([[assignmentRow()], []]);
    await expect(updateMeetingAssignment("asg-1", null, "p9")).resolves.toEqual({
      ok: false,
      error: "Ayudante no encontrado.",
    });
  });

  it("informa de tablas faltantes", async () => {
    mockDb.enqueue(rejection("meeting_assignments does not exist"));
    await expect(updateMeetingAssignment("asg-1", null)).resolves.toEqual({
      ok: false,
      error: MEETING_TABLES_MISSING_ERROR,
    });
  });

  it("informa error genérico cuando falla la base", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(updateMeetingAssignment("asg-1", null)).resolves.toEqual({
      ok: false,
      error: "No se pudo guardar la designación.",
    });
  });
});

describe("updateMeetingAssignmentDetails", () => {
  it("rechaza datos inválidos", async () => {
    await expect(updateMeetingAssignmentDetails({ assignmentId: "", title: "x" })).resolves.toEqual(
      {
        ok: false,
        error: "Datos no válidos.",
      },
    );
    expect(requirePrivilegedUser).toHaveBeenCalledTimes(1);
    expect(mockDb.calls).toEqual([]);
  });

  it("responde ok sin escribir cuando no hay campos", async () => {
    await expect(updateMeetingAssignmentDetails({ assignmentId: "asg-1" })).resolves.toEqual({
      ok: true,
    });
    expect(mockDb.calls).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("guarda los campos enviados", async () => {
    mockDb.enqueue([]);
    await expect(
      updateMeetingAssignmentDetails({ assignmentId: "asg-1", notes: "nota", study: "wStudy" }),
    ).resolves.toEqual({ ok: true });
    expect(setPayloads()[0]).toEqual({ notes: "nota", study: "wStudy" });
    expect(revalidatePath).toHaveBeenCalledWith("/reunioes");
  });

  it("con speakerName limpia el vínculo de persona", async () => {
    mockDb.enqueue([]);
    await expect(
      updateMeetingAssignmentDetails({
        assignmentId: "asg-1",
        classroom: "B",
        speakerName: "  Carlos Externo  ",
      }),
    ).resolves.toEqual({ ok: true });
    expect(setPayloads()[0]).toEqual({
      classroom: "B",
      personId: null,
      personName: "Carlos Externo",
      helperPersonId: null,
      helperPersonName: "",
    });
  });

  it("informa de tablas faltantes", async () => {
    mockDb.enqueue(rejection("meeting_assignments does not exist"));
    await expect(
      updateMeetingAssignmentDetails({ assignmentId: "asg-1", notes: "nota" }),
    ).resolves.toEqual({ ok: false, error: MEETING_TABLES_MISSING_ERROR });
  });

  it("informa error genérico cuando falla la base", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(
      updateMeetingAssignmentDetails({ assignmentId: "asg-1", notes: "nota" }),
    ).resolves.toEqual({ ok: false, error: "No se pudo guardar los detalles." });
  });
});

describe("updateMeetingException", () => {
  it("rechaza datos inválidos", async () => {
    await expect(
      updateMeetingException("", { exceptionType: "special", exceptionLabel: "" }),
    ).resolves.toEqual({ ok: false, error: "Datos no válidos." });
    await expect(
      updateMeetingException("prog-1", { exceptionType: "otra" as "", exceptionLabel: "" }),
    ).resolves.toEqual({ ok: false, error: "Datos no válidos." });
    expect(mockDb.calls).toEqual([]);
  });

  it("guarda la excepción del programa", async () => {
    mockDb.enqueue([]);
    await expect(
      updateMeetingException("prog-1", {
        exceptionType: "convention",
        exceptionLabel: "Asamblea de circuito",
      }),
    ).resolves.toEqual({ ok: true });
    expect(setPayloads()[0]).toMatchObject({
      exceptionType: "convention",
      exceptionLabel: "Asamblea de circuito",
    });
    expect(setPayloads()[0].updatedAt).toBeInstanceOf(Date);
    expect(revalidatePath).toHaveBeenCalledWith("/reunioes");
  });

  it("informa de tablas faltantes", async () => {
    mockDb.enqueue(rejection("meeting_programs does not exist"));
    await expect(
      updateMeetingException("prog-1", { exceptionType: "no_meeting", exceptionLabel: "" }),
    ).resolves.toEqual({ ok: false, error: MEETING_TABLES_MISSING_ERROR });
  });

  it("informa error genérico cuando falla la base", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(
      updateMeetingException("prog-1", { exceptionType: "no_meeting", exceptionLabel: "" }),
    ).resolves.toEqual({ ok: false, error: "No se pudo guardar la excepción." });
  });
});

describe("updateMeetingSong", () => {
  it("rechaza cántico inválido", async () => {
    await expect(updateMeetingSong("asg-1", 0, "Tema")).resolves.toEqual({
      ok: false,
      error: "Cántico no válido.",
    });
    await expect(updateMeetingSong("", 144, "Tema")).resolves.toEqual({
      ok: false,
      error: "Cántico no válido.",
    });
    expect(mockDb.calls).toEqual([]);
  });

  it("guarda el cántico y trunca el tema a 300 caracteres", async () => {
    mockDb.enqueue([]);
    const longTheme = "x".repeat(350);
    await expect(updateMeetingSong("asg-1", 144, longTheme)).resolves.toEqual({ ok: true });
    expect(setPayloads()[0].songNumber).toBe(144);
    expect(String(setPayloads()[0].songTheme)).toHaveLength(300);
    expect(revalidatePath).toHaveBeenCalledWith("/reunioes");
  });

  it("informa de tablas faltantes", async () => {
    mockDb.enqueue(rejection("meeting_assignments does not exist"));
    await expect(updateMeetingSong("asg-1", 145, "Tema")).resolves.toEqual({
      ok: false,
      error: MEETING_TABLES_MISSING_ERROR,
    });
  });

  it("informa error genérico cuando falla la base", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(updateMeetingSong("asg-1", 145, "Tema")).resolves.toEqual({
      ok: false,
      error: "No se pudo guardar el cántico.",
    });
  });
});

describe("saveStagedChanges", () => {
  it("rechaza lote inválido sin autenticar nem consultar", async () => {
    await expect(saveStagedChanges([])).resolves.toEqual({
      ok: false,
      error: "Datos no válidos.",
    });
    expect(requirePrivilegedUser).not.toHaveBeenCalled();
    expect(mockDb.calls).toEqual([]);
  });

  it("propaga FORBIDDEN de la autenticación", async () => {
    vi.mocked(requirePrivilegedUser).mockRejectedValue(new Error("FORBIDDEN"));
    await expect(saveStagedChanges([{ assignmentId: "asg-1", label: "Parte" }])).rejects.toThrow(
      "FORBIDDEN",
    );
    expect(mockDb.calls).toEqual([]);
  });

  it("salva o lote com 1 auth, selects em lote e 1 revalidate", async () => {
    mockDb.enqueueMany([
      [
        { id: "p1", firstName: "Juan", lastName: "Pérez" },
        { id: "p2", firstName: "Ana", lastName: "García" },
      ],
      [
        assignmentRow({ id: "asg-1", helperPersonId: "p9", helperPersonName: "Viejo" }),
        assignmentRow({ id: "asg-2" }),
      ],
      [],
      [],
      [],
    ]);
    const result = await saveStagedChanges([
      {
        assignmentId: "asg-1",
        label: "Lectura",
        personId: "p1",
        helperPersonId: "p2",
        songNumber: 12,
        songTheme: "Tema",
      },
      { assignmentId: "asg-2", label: "Discurso", title: "Nuevo título" },
    ]);
    expect(result).toEqual({ ok: true });
    expect(requirePrivilegedUser).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/reunioes");
    const patches = mockDb.calls.filter((call) => call.fn === "set").map((call) => call.args[0]);
    expect(patches).toHaveLength(3);
    expect(patches[0]).toMatchObject({
      personId: "p1",
      personName: "Juan Pérez",
      helperPersonId: "p2",
      helperPersonName: "Ana García",
      songNumber: 12,
      songTheme: "Tema",
    });
    expect(patches[1]).toMatchObject({ title: "Nuevo título" });
    // Rodízio: um update só com as pessoas tocadas.
    expect(patches[2]).toEqual({ lastAssignmentAt: expect.any(Date) });
    const whereIn = mockDb.calls.filter((call) => call.fn === "where").map((call) => call.args[0]);
    expect(whereIn.length).toBeGreaterThanOrEqual(3);
    expect(mockDb.pending).toBe(0);
  });

  it("limpa pessoa com null e mantém ajudante existente", async () => {
    mockDb.enqueueMany([
      [assignmentRow({ id: "asg-1", helperPersonId: "p9", helperPersonName: "Viejo" })],
      [],
    ]);
    const result = await saveStagedChanges([
      { assignmentId: "asg-1", label: "Lectura", personId: null },
    ]);
    expect(result).toEqual({ ok: true });
    const patches = mockDb.calls.filter((call) => call.fn === "set").map((call) => call.args[0]);
    expect(patches[0]).toMatchObject({
      personId: null,
      personName: "",
      helperPersonId: "p9",
      helperPersonName: "Viejo",
    });
    expect(mockDb.pending).toBe(0);
  });

  it("orador de fora limpa vínculos e grava nome livre", async () => {
    mockDb.enqueueMany([[assignmentRow({ id: "asg-1" })], []]);
    const result = await saveStagedChanges([
      {
        assignmentId: "asg-1",
        label: "Discurso",
        speakerName: "Orador Visitante",
        speakerCongregation: "Norte",
      },
    ]);
    expect(result).toEqual({ ok: true });
    const patches = mockDb.calls.filter((call) => call.fn === "set").map((call) => call.args[0]);
    expect(patches[0]).toMatchObject({
      personId: null,
      personName: "Orador Visitante",
      helperPersonId: null,
      helperPersonName: "",
      speakerCongregation: "Norte",
    });
    expect(mockDb.pending).toBe(0);
  });

  it("falha com rótulo quando a parte não existe", async () => {
    mockDb.enqueue([]);
    const result = await saveStagedChanges([{ assignmentId: "asg-9", label: "Perdida" }]);
    expect(result).toEqual({ ok: false, failedLabel: "Perdida", error: "Parte no encontrada." });
    expect(mockDb.calls.some((call) => call.fn === "update")).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(mockDb.pending).toBe(0);
  });

  it("falha com rótulo quando a pessoa não existe", async () => {
    mockDb.enqueueMany([[], [assignmentRow({ id: "asg-1" })]]);
    const result = await saveStagedChanges([
      { assignmentId: "asg-1", label: "Lectura", personId: "p9" },
    ]);
    expect(result).toEqual({ ok: false, failedLabel: "Lectura", error: "Persona no encontrada." });
    expect(mockDb.pending).toBe(0);
  });

  it("informa de tablas faltantes", async () => {
    mockDb.enqueue(rejection("meeting_assignments does not exist"));
    await expect(saveStagedChanges([{ assignmentId: "asg-1", label: "Lectura" }])).resolves.toEqual(
      { ok: false, error: MEETING_TABLES_MISSING_ERROR },
    );
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("informa error genérico cuando falla un update", async () => {
    mockDb.enqueueMany([[assignmentRow({ id: "asg-1" })], rejection("fallo transitorio")]);
    await expect(
      saveStagedChanges([{ assignmentId: "asg-1", label: "Lectura", title: "T" }]),
    ).resolves.toEqual({ ok: false, error: "No se pudieron guardar las designaciones." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

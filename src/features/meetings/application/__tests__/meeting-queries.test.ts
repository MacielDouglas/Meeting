import { mockDb, rejected } from "@test/mock-db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  requireAuthenticatedUser,
  requirePrivilegedUser,
} from "@/features/auth/application/session";
import type { AuthUser } from "@/features/auth/domain/user";
import {
  getMeetingProgram,
  listProgramDates,
  listProgramsForPdf,
} from "@/features/meetings/application/meeting-queries";

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

interface ChunkLike {
  queryChunks?: unknown[];
  value?: unknown;
  encoder?: unknown;
}

function collectParams(node: unknown, out: unknown[] = []): unknown[] {
  if (Array.isArray(node)) {
    for (const item of node) collectParams(item, out);
    return out;
  }
  if (node === null || typeof node !== "object") return out;
  const chunk = node as ChunkLike;
  if (chunk.encoder !== undefined && "value" in chunk) {
    out.push(chunk.value);
    return out;
  }
  if (Array.isArray(chunk.queryChunks)) {
    collectParams(chunk.queryChunks, out);
    return out;
  }
  return out;
}

function rejection(message: string): unknown {
  return rejected(new Error(message));
}

const user: AuthUser = { id: "user-1", email: "a@b.c", name: "Prueba", image: null, role: "admin" };

function programRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "prog-1",
    kind: "midweek",
    weekStart: "2026-09-21",
    date: "2026-09-23",
    outlineId: "outline-1",
    createdBy: "user-1",
    status: "draft",
    exceptionType: null,
    exceptionLabel: null,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  };
}

function assignmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "asg-1",
    programId: "prog-1",
    partKey: "opening-comments",
    section: "Sección inicial",
    title: "Palabras de introducción",
    subtitle: "Subtítulo",
    startTime: "0:00",
    durationMinutes: 5,
    personId: null,
    personName: "",
    helperPersonId: null,
    helperPersonName: "",
    songNumber: null,
    songTheme: "",
    classroom: null,
    study: null,
    source: null,
    notes: null,
    speakerCongregation: null,
    sortOrder: 0,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  mockDb.reset();
  vi.clearAllMocks();
  vi.mocked(requireAuthenticatedUser).mockResolvedValue(user);
  vi.mocked(requirePrivilegedUser).mockResolvedValue(user);
});

describe("getMeetingProgram", () => {
  it("devuelve null cuando no hay programa para la semana", async () => {
    mockDb.enqueue([]);
    await expect(getMeetingProgram("midweek", "2026-09-21")).resolves.toBeNull();
    expect(requireAuthenticatedUser).toHaveBeenCalledTimes(1);
    expect(mockDb.calls.map((call) => call.fn)).toEqual(["select", "from", "where", "limit"]);
    expect(mockDb.pending).toBe(0);
  });

  it("mapea el programa existente con sus designaciones", async () => {
    mockDb.enqueueMany([
      [
        programRow({
          status: "confirmed",
          exceptionType: "convention",
          exceptionLabel: "Asamblea",
        }),
      ],
      [
        assignmentRow(),
        assignmentRow({
          id: "asg-2",
          partKey: "song-145",
          title: "Cántico 145",
          songNumber: 145,
          songTheme: "Lealtad",
          personId: "p1",
          personName: "Juan Pérez",
          helperPersonId: "p2",
          helperPersonName: "Ana García",
          classroom: "B",
          study: "wStudy",
          source: "w25.06",
          notes: "nota",
          speakerCongregation: "Congregación Centro",
          sortOrder: 1,
        }),
      ],
    ]);
    const result = await getMeetingProgram("midweek", "2026-09-21");
    expect(result?.program).toEqual({
      id: "prog-1",
      kind: "midweek",
      weekStart: "2026-09-21",
      date: "2026-09-23",
      outlineId: "outline-1",
      status: "confirmed",
      exceptionType: "convention",
      exceptionLabel: "Asamblea",
      assignmentCount: 2,
    });
    expect(result?.assignments).toHaveLength(2);
    expect(result?.assignments[0]).toEqual({
      id: "asg-1",
      programId: "prog-1",
      partKey: "opening-comments",
      section: "Sección inicial",
      title: "Palabras de introducción",
      subtitle: "Subtítulo",
      startTime: "0:00",
      durationMinutes: 5,
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
    });
    expect(result?.assignments[1]).toMatchObject({
      personName: "Juan Pérez",
      helperPersonName: "Ana García",
      classroom: "B",
      songNumber: 145,
    });
    expect(mockDb.pending).toBe(0);
  });

  it("aplica valores por defecto cuando la excepción es null", async () => {
    mockDb.enqueueMany([[programRow()], []]);
    const result = await getMeetingProgram("weekend", "2026-09-21");
    expect(result?.program.exceptionType).toBe("");
    expect(result?.program.exceptionLabel).toBe("");
    expect(result?.program.assignmentCount).toBe(0);
    expect(result?.assignments).toEqual([]);
  });

  it("devuelve null cuando faltan las tablas y registra el aviso", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockDb.enqueue(rejection('relation "meeting_programs" does not exist'));
    await expect(getMeetingProgram("midweek", "2026-09-21")).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("db:push"), expect.any(Error));
    errorSpy.mockRestore();
  });

  it("propaga errores que no son de tablas faltantes", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(getMeetingProgram("midweek", "2026-09-21")).rejects.toThrow("fallo transitorio");
  });
});

describe("listProgramsForPdf", () => {
  it("arma el PDF con cada programa y sus designaciones mapeadas", async () => {
    mockDb.enqueueMany([
      [
        programRow({ id: "p-mon", weekStart: "2026-09-14", date: "2026-09-16" }),
        programRow({ id: "p-tue", kind: "weekend", weekStart: "2026-09-21", date: "2026-09-20" }),
      ],
      [assignmentRow({ id: "a-mon", programId: "p-mon" })],
    ]);
    const items = await listProgramsForPdf("midweek", "2026-09-16", "2026-09-27");
    expect(requirePrivilegedUser).toHaveBeenCalledTimes(1);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      id: "p-mon",
      kind: "midweek",
      weekStart: "2026-09-14",
      date: "2026-09-16",
      assignments: [
        expect.objectContaining({ id: "a-mon", classroom: "A", speakerCongregation: "" }),
      ],
    });
    expect(items[1]?.assignments).toEqual([]);
    expect(mockDb.pending).toBe(0);
  });

  it("expande el lunes de la semana en el filtro del intervalo", async () => {
    mockDb.enqueue([]);
    await listProgramsForPdf("midweek", "2026-09-23", "2026-09-27");
    const whereCall = mockDb.calls.find((call) => call.fn === "where");
    expect(collectParams(whereCall?.args[0])).toEqual(["midweek", "2026-09-21", "2026-09-27"]);
  });

  it("exige usuario privilegiado", async () => {
    vi.mocked(requirePrivilegedUser).mockRejectedValue(new Error("FORBIDDEN"));
    await expect(listProgramsForPdf("midweek", "2026-09-21", "2026-09-27")).rejects.toThrow(
      "FORBIDDEN",
    );
    expect(mockDb.calls).toEqual([]);
  });
});

describe("listProgramDates", () => {
  it("devuelve fechas únicas ordenadas del intervalo", async () => {
    mockDb.enqueue([{ date: "2026-09-27" }, { date: "2026-09-21" }, { date: "2026-09-21" }]);
    await expect(listProgramDates("midweek", "2026-09-21", "2026-09-27")).resolves.toEqual([
      "2026-09-21",
      "2026-09-27",
    ]);
    expect(requirePrivilegedUser).toHaveBeenCalledTimes(1);
    const whereCall = mockDb.calls.find((call) => call.fn === "where");
    expect(collectParams(whereCall?.args[0])).toEqual(["midweek", "2026-09-21", "2026-09-27"]);
  });

  it("devuelve lista vacía cuando no hay programas", async () => {
    mockDb.enqueue([]);
    await expect(listProgramDates("weekend", "2026-09-21", "2026-09-27")).resolves.toEqual([]);
  });
});

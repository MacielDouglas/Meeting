import { mockDb, rejected } from "@test/mock-db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  requireAuthenticatedUser,
  requirePrivilegedUser,
} from "@/features/auth/application/session";
import type { AuthUser } from "@/features/auth/domain/user";
import {
  getDutyProgramDetail,
  listActiveDutyDates,
  listDutyAssignmentsForDates,
  listDutyCandidates,
  listDutyEligiblePersons,
  listDutyPrograms,
  listPersonDutiesInRange,
  listPersonDutyHistory,
  listUpcomingDutyDates,
  listUpcomingPersonDuties,
} from "@/features/meeting-duties/application/duty-queries";

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

const user: AuthUser = { id: "user-1", email: "a@b.c", name: "Prueba", image: null, role: "admin" };

function rejection(message: string): unknown {
  return rejected(new Error(message));
}

function programRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "dp-1",
    startDate: "2026-09-21",
    endDate: "2026-09-27",
    status: "draft",
    createdBy: "user-1",
    createdAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  };
}

function assignmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "da-1",
    programId: "dp-1",
    assignmentDate: "2026-09-23",
    meetingKind: "midweek",
    dutyKey: "usher",
    postLabel: "Acomodador A",
    side: "interno",
    personId: "p1",
    personName: "Juan Pérez",
    isManual: false,
    sortOrder: 1,
    ...overrides,
  };
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

beforeEach(() => {
  mockDb.reset();
  vi.clearAllMocks();
  vi.mocked(requireAuthenticatedUser).mockResolvedValue(user);
  vi.mocked(requirePrivilegedUser).mockResolvedValue(user);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("listDutyPrograms", () => {
  it("exige privilegios y mapea los programas con su recuento", async () => {
    mockDb.enqueue([
      { ...programRow({ status: "confirmed" }), assignmentCount: 3 },
      { ...programRow({ id: "dp-2", startDate: "2026-09-14" }), assignmentCount: 0 },
    ]);
    const items = await listDutyPrograms();
    expect(requirePrivilegedUser).toHaveBeenCalledTimes(1);
    expect(items).toEqual([
      expect.objectContaining({ id: "dp-1", status: "confirmed", assignmentCount: 3 }),
      expect.objectContaining({ id: "dp-2", status: "draft", assignmentCount: 0 }),
    ]);
    expect(items[0]?.createdAt).toBeInstanceOf(Date);
    expect(mockDb.pending).toBe(0);
  });

  it("devuelve lista vacía si las tablas aún no existen", async () => {
    mockDb.enqueue(rejection('relation "duty_programs" does not exist'));
    await expect(listDutyPrograms()).resolves.toEqual([]);
  });
});

describe("getDutyProgramDetail", () => {
  it("devuelve null cuando el programa no existe", async () => {
    mockDb.enqueue([]);
    await expect(getDutyProgramDetail("dp-9")).resolves.toBeNull();
    expect(mockDb.calls.filter((call) => call.fn === "select")).toHaveLength(1);
  });

  it("devuelve null si falla la consulta del programa", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(getDutyProgramDetail("dp-1")).resolves.toBeNull();
  });

  it("arma el detalle con nombres de puesto desde los setores", async () => {
    mockDb.enqueueMany([
      [programRow({ status: "archived" })],
      [assignmentRow(), assignmentRow({ id: "da-2", dutyKey: "custom", side: null })],
      [
        { personFlag: "usher", name: "Acomodadores" },
        { personFlag: null, name: "Ignorado" },
      ],
      [{ count: 7 }],
    ]);
    const detail = await getDutyProgramDetail("dp-1");
    expect(detail?.program).toEqual({
      id: "dp-1",
      startDate: "2026-09-21",
      endDate: "2026-09-27",
      status: "archived",
      createdBy: "user-1",
      createdAt: expect.any(Date),
      assignmentCount: 7,
    });
    expect(detail?.assignments.map((item) => item.dutyName)).toEqual([
      "Acomodadores",
      "Acomodador A",
    ]);
    expect(detail?.assignments[1]).toMatchObject({ dutyKey: "custom", side: null });
    expect(console.error).not.toHaveBeenCalled();
    expect(mockDb.pending).toBe(0);
  });

  it("cai al rótulo guardado cuando los setores no existen", async () => {
    mockDb.enqueueMany([
      [programRow()],
      [assignmentRow()],
      rejection('relation "designation_sectors" does not exist'),
      [{ count: 1 }],
    ]);
    const detail = await getDutyProgramDetail("dp-1");
    expect(detail?.assignments[0]?.dutyName).toBe("Acomodador A");
    expect(console.error).toHaveBeenCalledWith(
      "[duties] falha ao buscar nomes dos setores",
      expect.objectContaining({ programId: "dp-1" }),
    );
    expect(mockDb.pending).toBe(0);
  });
});

describe("listDutyEligiblePersons", () => {
  it("mapea flags y ordena los nombres según es", async () => {
    mockDb.enqueue([
      personRow({ id: "p2", firstName: "Zeta", lastName: "Ana" }),
      { ...personRow({ id: "p3", firstName: "  Ana", lastName: "Silva " }), sex: "female" },
      personRow({ id: "p1", firstName: "Juan", lastName: "Pérez", sound: true }),
    ]);
    const items = await listDutyEligiblePersons();
    expect(items.map((item) => item.name)).toEqual(["Ana Silva", "Juan Pérez", "Zeta Ana"]);
    expect(items[0]).toEqual({
      id: "p3",
      name: "Ana Silva",
      sex: "female",
      flags: { usher: true, sound: false, video: false, microphone: true, platform: false },
    });
    expect(items[1]?.flags.sound).toBe(true);
    expect(requirePrivilegedUser).toHaveBeenCalledTimes(1);
    expect(mockDb.pending).toBe(0);
  });

  it("devuelve lista vacía si falla la consulta", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(listDutyEligiblePersons()).resolves.toEqual([]);
  });
});

describe("listPersonDutyHistory", () => {
  it("devuelve el histórico omitiendo filas sin persona", async () => {
    mockDb.enqueue([
      { personId: "p1", date: "2026-09-23" },
      { personId: null, date: "2026-09-27" },
      { personId: "p2", date: "2026-09-20" },
    ]);
    await expect(listPersonDutyHistory()).resolves.toEqual([
      { personId: "p1", date: "2026-09-23" },
      { personId: "p2", date: "2026-09-20" },
    ]);
    expect(mockDb.pending).toBe(0);
  });

  it("devuelve lista vacía si falla la consulta", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(listPersonDutyHistory()).resolves.toEqual([]);
  });
});

describe("listPersonDutiesInRange", () => {
  it("usa la sesión autenticada y devuelve las filas del intervalo", async () => {
    const rows = [
      {
        assignmentDate: "2026-09-23",
        dutyKey: "usher",
        postLabel: "A",
        side: "interno",
        sortOrder: 0,
      },
    ];
    mockDb.enqueue(rows);
    await expect(listPersonDutiesInRange("p1", "2026-09-21", "2026-09-27")).resolves.toEqual(rows);
    expect(requireAuthenticatedUser).toHaveBeenCalledTimes(1);
    expect(requirePrivilegedUser).not.toHaveBeenCalled();
    expect(mockDb.pending).toBe(0);
  });

  it("devuelve lista vacía si falla la consulta", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(listPersonDutiesInRange("p1", "2026-09-21", "2026-09-27")).resolves.toEqual([]);
  });
});

describe("listUpcomingPersonDuties", () => {
  it("limita a 6 por defecto", async () => {
    mockDb.enqueue([]);
    await expect(listUpcomingPersonDuties("p1", "2026-09-21")).resolves.toEqual([]);
    expect(mockDb.calls).toContainEqual({ fn: "limit", args: [6] });
    expect(requireAuthenticatedUser).toHaveBeenCalledTimes(1);
  });

  it("respeta el límite personalizado", async () => {
    mockDb.enqueue([]);
    await listUpcomingPersonDuties("p1", "2026-09-21", 2);
    expect(mockDb.calls).toContainEqual({ fn: "limit", args: [2] });
  });

  it("devuelve lista vacía si falla la consulta", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(listUpcomingPersonDuties("p1", "2026-09-21")).resolves.toEqual([]);
  });
});

describe("listDutyCandidates", () => {
  it("devuelve solo hombres con la flag del puesto", async () => {
    const rows = [
      personRow({ id: "p1", firstName: "Juan", lastName: "Pérez", usher: true }),
      personRow({ id: "p2", firstName: "Pedro", lastName: "Sin", usher: false, sound: true }),
      personRow({ id: "p3", firstName: "María", lastName: "Mujer", sex: "female", usher: true }),
    ];
    mockDb.enqueueMany([rows, rows]);
    await expect(listDutyCandidates("usher")).resolves.toEqual([{ id: "p1", name: "Juan Pérez" }]);
    await expect(listDutyCandidates("sound")).resolves.toEqual([{ id: "p2", name: "Pedro Sin" }]);
    expect(mockDb.pending).toBe(0);
  });
});

describe("listActiveDutyDates", () => {
  it("devuelve el conjunto de fechas con escala activa", async () => {
    mockDb.enqueue([{ date: "2026-09-23" }, { date: "2026-09-23" }, { date: "2026-09-27" }]);
    const dates = await listActiveDutyDates();
    expect(dates).toEqual(new Set(["2026-09-23", "2026-09-27"]));
    expect(mockDb.calls.map((call) => call.fn)).toContain("innerJoin");
    expect(mockDb.pending).toBe(0);
  });

  it("devuelve conjunto vacío si falla la consulta", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    const dates = await listActiveDutyDates();
    expect(dates.size).toBe(0);
  });
});

describe("listDutyAssignmentsForDates", () => {
  it("responde vacío sin consultar la base cuando no hay fechas", async () => {
    await expect(listDutyAssignmentsForDates([])).resolves.toEqual([]);
    expect(requireAuthenticatedUser).toHaveBeenCalledTimes(1);
    expect(mockDb.calls).toEqual([]);
  });

  it("arma los apoios por fecha con nombres desde los setores", async () => {
    mockDb.enqueueMany([
      [
        {
          assignmentDate: "2026-09-23",
          dutyKey: "usher",
          postLabel: "Acomodador A",
          side: "interno",
          personName: "Juan Pérez",
          status: "confirmed",
          sortOrder: 0,
        },
        {
          assignmentDate: "2026-09-23",
          dutyKey: "sound",
          postLabel: "Som",
          side: null,
          personName: "",
          status: "draft",
          sortOrder: 1,
        },
      ],
      [{ personFlag: "usher", name: "Acomodadores" }],
    ]);
    const items = await listDutyAssignmentsForDates(["2026-09-23"]);
    expect(items).toEqual([
      expect.objectContaining({ dutyName: "Acomodadores", status: "confirmed" }),
      expect.objectContaining({ dutyName: "Som", status: "draft" }),
    ]);
    expect(items[1]?.side).toBeNull();
    expect(mockDb.pending).toBe(0);
  });

  it("cai al rótulo guardado cuando los setores no existen", async () => {
    mockDb.enqueueMany([
      [
        {
          assignmentDate: "2026-09-23",
          dutyKey: "usher",
          postLabel: "Acomodador A",
          side: null,
          personName: "Juan Pérez",
          status: "draft",
          sortOrder: 0,
        },
      ],
      rejection('relation "designation_sectors" does not exist'),
    ]);
    const items = await listDutyAssignmentsForDates(["2026-09-23"]);
    expect(items[0]?.dutyName).toBe("Acomodador A");
    expect(console.error).toHaveBeenCalledWith(
      "[duties] falha ao buscar nomes dos setores",
      expect.objectContaining({ dates: ["2026-09-23"] }),
    );
    expect(mockDb.pending).toBe(0);
  });

  it("devuelve lista vacía si falla la consulta principal", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(listDutyAssignmentsForDates(["2026-09-23"])).resolves.toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      "[duties] falha ao listar apoio por data",
      expect.objectContaining({ dates: ["2026-09-23"] }),
    );
  });
});

describe("listUpcomingDutyDates", () => {
  it("devuelve las fechas próximas con límite 8 por defecto", async () => {
    mockDb.enqueue([{ date: "2026-09-23" }, { date: "2026-09-27" }]);
    await expect(listUpcomingDutyDates("2026-09-21")).resolves.toEqual([
      "2026-09-23",
      "2026-09-27",
    ]);
    expect(mockDb.calls).toContainEqual({ fn: "limit", args: [8] });
    expect(mockDb.calls.map((call) => call.fn)).toContain("selectDistinct");
    expect(requireAuthenticatedUser).toHaveBeenCalledTimes(1);
    expect(mockDb.pending).toBe(0);
  });

  it("respeta el límite personalizado", async () => {
    mockDb.enqueue([]);
    await listUpcomingDutyDates("2026-09-21", 3);
    expect(mockDb.calls).toContainEqual({ fn: "limit", args: [3] });
  });

  it("devuelve lista vacía si falla la consulta", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(listUpcomingDutyDates("2026-09-21")).resolves.toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      "[duties] falha ao listar datas com apoio",
      expect.objectContaining({ fromDate: "2026-09-21" }),
    );
  });
});

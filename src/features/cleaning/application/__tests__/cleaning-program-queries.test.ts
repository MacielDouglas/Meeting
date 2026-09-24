import { mockDb } from "@test/mock-db";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import {
  requireAuthenticatedUser,
  requirePrivilegedUser,
} from "@/features/auth/application/session";
import {
  getCleaningProgramDetail,
  getEnabledCleaningSectors,
  getLatestAssignmentDate,
  getManyPersonCleaningHistories,
  getPersonAssignmentCountInSector,
  getPersonCleaningHistory,
  listCleaningAssignmentsForDates,
  listCleaningPrograms,
  listEligiblePersons,
  listFamilyMembers,
  listPersonCleaningInRange,
  listUpcomingCleaningDates,
} from "@/features/cleaning/application/cleaning-program-queries";

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

const fakeUser = {
  id: "u1",
  email: "owner@example.com",
  name: "Owner",
  role: "owner" as const,
};

function rejected(reason: unknown): Promise<unknown> {
  return Promise.resolve().then(() => {
    throw reason;
  });
}

let consoleError: MockInstance;

beforeEach(() => {
  mockDb.reset();
  vi.mocked(requirePrivilegedUser).mockReset();
  vi.mocked(requireAuthenticatedUser).mockReset();
  vi.mocked(requirePrivilegedUser).mockResolvedValue(fakeUser);
  vi.mocked(requireAuthenticatedUser).mockResolvedValue(fakeUser);
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("listCleaningPrograms", () => {
  it("retorna los programas con su conteo de designaciones", async () => {
    mockDb.enqueue([
      {
        id: "pg1",
        typeKey: "weekly",
        startDate: "2026-09-01",
        endDate: "2026-09-06",
        status: "draft",
        createdBy: "u1",
        createdAt: new Date("2026-09-01T10:00:00Z"),
        assignmentCount: 4,
      },
    ]);

    const programs = await listCleaningPrograms();

    expect(programs).toHaveLength(1);
    expect(programs[0]).toMatchObject({
      id: "pg1",
      typeKey: "weekly",
      status: "draft",
      assignmentCount: 4,
    });
    expect(vi.mocked(requirePrivilegedUser)).toHaveBeenCalledTimes(1);
  });

  it("filtra por tipo cuando se informa y omite el filtro en caso contrario", async () => {
    mockDb.enqueueMany([[], []]);

    await listCleaningPrograms();
    await listCleaningPrograms("weekly");

    const whereCalls = mockDb.calls.filter((call) => call.fn === "where");
    expect(whereCalls).toHaveLength(2);
    expect(whereCalls[0].args[0]).toBeUndefined();
    expect(whereCalls[1].args[0]).toBeDefined();
  });
});

describe("getCleaningProgramDetail", () => {
  it("arma el detalle con las designaciones del programa", async () => {
    const programRow = {
      id: "pg1",
      typeKey: "per_meeting",
      startDate: "2026-09-01",
      endDate: "2026-09-06",
      status: "confirmed",
      createdBy: "u1",
      createdAt: new Date("2026-09-01T10:00:00Z"),
      updatedAt: new Date("2026-09-01T10:00:00Z"),
    };
    const assignmentRows = [
      {
        id: "a1",
        programId: "pg1",
        assignmentDate: "2026-09-01",
        sectorKey: "auditorio",
        sectorName: "Auditorio",
        personId: "p1",
        personName: "Ana Pérez",
        isFamily: false,
        sortOrder: 0,
        createdAt: new Date("2026-09-01T10:00:00Z"),
      },
      {
        id: "a2",
        programId: "pg1",
        assignmentDate: "2026-09-06",
        sectorKey: "auditorio",
        sectorName: "Auditorio",
        personId: null,
        personName: "",
        isFamily: true,
        sortOrder: 1,
        createdAt: new Date("2026-09-01T10:00:00Z"),
      },
    ];
    mockDb.enqueueMany([[programRow], assignmentRows]);

    const detail = await getCleaningProgramDetail("pg1");

    expect(detail.program).toMatchObject({
      id: "pg1",
      status: "confirmed",
      assignmentCount: 2,
    });
    expect(detail.assignments.map((assignment) => assignment.id)).toEqual(["a1", "a2"]);
    expect(detail.assignments[1].isFamily).toBe(true);
  });

  it("lança «Programa no encontrado» cuando no existe", async () => {
    mockDb.enqueue([]);

    await expect(getCleaningProgramDetail("nope")).rejects.toThrow("Programa no encontrado.");
  });

  it("arma el detalle sin designaciones cuando el programa no tiene", async () => {
    const programRow = {
      id: "pg1",
      typeKey: "general",
      startDate: "2026-09-01",
      endDate: "2026-09-01",
      status: "draft",
      createdBy: null,
      createdAt: new Date("2026-09-01T10:00:00Z"),
      updatedAt: new Date("2026-09-01T10:00:00Z"),
    };
    mockDb.enqueueMany([[programRow], []]);

    const detail = await getCleaningProgramDetail("pg1");

    expect(detail.program.assignmentCount).toBe(0);
    expect(detail.assignments).toEqual([]);
  });
});

describe("getManyPersonCleaningHistories / getPersonCleaningHistory", () => {
  it("agrupa el histórico por persona y respeta el límite", async () => {
    mockDb.enqueue([
      { personId: "p1", sectorKey: "a", sectorName: "A", assignmentDate: "2026-09-06" },
      { personId: "p1", sectorKey: "b", sectorName: "B", assignmentDate: "2026-09-04" },
      { personId: "p1", sectorKey: "c", sectorName: "C", assignmentDate: "2026-09-01" },
      { personId: "p2", sectorKey: "a", sectorName: "A", assignmentDate: "2026-09-05" },
    ]);

    const map = await getManyPersonCleaningHistories(["p1", "p2"], 2);

    expect(map.get("p1")).toEqual([
      { sectorKey: "a", sectorName: "A", assignmentDate: "2026-09-06" },
      { sectorKey: "b", sectorName: "B", assignmentDate: "2026-09-04" },
    ]);
    expect(map.get("p2")).toHaveLength(1);
    expect(mockDb.calls.find((call) => call.fn === "limit")?.args[0]).toBe(4);
  });

  it("ignora las filas sin persona asignada", async () => {
    mockDb.enqueue([
      { personId: null, sectorKey: "a", sectorName: "A", assignmentDate: "2026-09-06" },
      { personId: "p2", sectorKey: "a", sectorName: "A", assignmentDate: "2026-09-05" },
    ]);

    const map = await getManyPersonCleaningHistories(["p1"]);

    expect([...map.keys()]).toEqual(["p2"]);
  });

  it("no consulta la base con lista de personas vacía", async () => {
    const map = await getManyPersonCleaningHistories([]);

    expect(map.size).toBe(0);
    expect(mockDb.calls).toHaveLength(0);
  });

  it("getPersonCleaningHistory devuelve vacío sin histórico", async () => {
    mockDb.enqueue([]);

    await expect(getPersonCleaningHistory("p9")).resolves.toEqual([]);
  });
});

describe("listPersonCleaningInRange", () => {
  it("retorna la limpieza del intervalo con isFamily false por defecto", async () => {
    mockDb.enqueue([
      {
        assignmentDate: "2026-09-01",
        sectorKey: "auditorio",
        sectorName: "Auditorio",
        isFamily: null,
      },
      {
        assignmentDate: "2026-09-06",
        sectorKey: "banheiro",
        sectorName: "Baño",
        isFamily: true,
      },
    ]);

    const items = await listPersonCleaningInRange("p1", "2026-09-01", "2026-09-07");

    expect(items).toEqual([
      {
        assignmentDate: "2026-09-01",
        sectorKey: "auditorio",
        sectorName: "Auditorio",
        isFamily: false,
      },
      { assignmentDate: "2026-09-06", sectorKey: "banheiro", sectorName: "Baño", isFamily: true },
    ]);
    expect(vi.mocked(requireAuthenticatedUser)).toHaveBeenCalledTimes(1);
  });

  it("exige un usuario autenticado", async () => {
    vi.mocked(requireAuthenticatedUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"));

    await expect(listPersonCleaningInRange("p1", "2026-09-01", "2026-09-07")).rejects.toThrow(
      "UNAUTHORIZED",
    );
  });
});

describe("listEligiblePersons", () => {
  it("retorna personas elegibles con young false por defecto", async () => {
    mockDb.enqueue([
      {
        id: "p1",
        firstName: "Ana",
        lastName: "Pérez",
        sex: "female",
        cleaning: true,
        young: null,
        familyHead: false,
        familyMemberId: null,
      },
    ]);

    const persons = await listEligiblePersons();

    expect(persons).toEqual([
      {
        id: "p1",
        firstName: "Ana",
        lastName: "Pérez",
        sex: "female",
        cleaning: true,
        young: false,
        familyHead: false,
        familyMemberId: null,
      },
    ]);
  });

  it("limita el resultado entre 1 y 200", async () => {
    mockDb.enqueueMany([[], [], []]);

    await listEligiblePersons(undefined, { limit: 500 });
    await listEligiblePersons(undefined, { limit: 0 });
    await listEligiblePersons();

    const limits = mockDb.calls.filter((call) => call.fn === "limit").map((call) => call.args[0]);
    expect(limits).toEqual([200, 1, 60]);
  });
});

describe("listFamilyMembers", () => {
  it("retorna los miembros de la familia con los defaults", async () => {
    mockDb.enqueue([
      {
        id: "p2",
        firstName: "Luis",
        lastName: "Pérez",
        sex: "male",
        cleaning: true,
        young: null,
        familyHead: false,
        familyMemberId: "p1",
      },
    ]);

    const members = await listFamilyMembers("p1");

    expect(members).toEqual([
      {
        id: "p2",
        firstName: "Luis",
        lastName: "Pérez",
        sex: "male",
        cleaning: true,
        young: false,
        familyHead: false,
        familyMemberId: "p1",
      },
    ]);
  });
});

describe("getPersonAssignmentCountInSector", () => {
  it("retorna la contagem devuelta por la base", async () => {
    mockDb.enqueue([{ count: 7 }]);

    await expect(getPersonAssignmentCountInSector("p1", "auditorio")).resolves.toBe(7);
  });

  it("retorna 0 sin filas", async () => {
    mockDb.enqueue([]);

    await expect(getPersonAssignmentCountInSector("p1", "auditorio")).resolves.toBe(0);
  });
});

describe("getLatestAssignmentDate", () => {
  it("retorna la fecha más reciente", async () => {
    mockDb.enqueue([{ assignmentDate: "2026-09-04" }]);

    await expect(getLatestAssignmentDate("p1")).resolves.toBe("2026-09-04");
  });

  it("retorna null sin designaciones", async () => {
    mockDb.enqueue([]);

    await expect(getLatestAssignmentDate("p1")).resolves.toBeNull();
  });
});

describe("getEnabledCleaningSectors", () => {
  it("retorna los sectores habilitados del tipo", async () => {
    const rows = [
      {
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
        createdAt: new Date("2026-09-01T10:00:00Z"),
        updatedAt: new Date("2026-09-01T10:00:00Z"),
      },
    ];
    mockDb.enqueue(rows);

    await expect(getEnabledCleaningSectors("per_meeting")).resolves.toEqual(rows);
    expect(mockDb.calls.some((call) => call.fn === "orderBy")).toBe(true);
  });
});

describe("listCleaningAssignmentsForDates", () => {
  it("retorna vacío sin consultar la base cuando no hay fechas", async () => {
    await expect(listCleaningAssignmentsForDates([])).resolves.toEqual([]);
    expect(mockDb.calls).toHaveLength(0);
    expect(vi.mocked(requireAuthenticatedUser)).toHaveBeenCalledTimes(1);
  });

  it("retorna las designaciones por fecha con isFamily false por defecto", async () => {
    mockDb.enqueue([
      {
        assignmentDate: "2026-09-01",
        typeKey: "per_meeting",
        sectorKey: "auditorio",
        sectorName: "Auditorio",
        personName: "Ana Pérez",
        isFamily: null,
        status: "confirmed",
      },
      {
        assignmentDate: "2026-09-06",
        typeKey: "per_meeting",
        sectorKey: "banheiro",
        sectorName: "Baño",
        personName: "Luis Pérez",
        isFamily: true,
        status: "draft",
      },
    ]);

    const items = await listCleaningAssignmentsForDates(["2026-09-01", "2026-09-06"]);

    expect(items).toEqual([
      {
        assignmentDate: "2026-09-01",
        typeKey: "per_meeting",
        sectorKey: "auditorio",
        sectorName: "Auditorio",
        personName: "Ana Pérez",
        isFamily: false,
        status: "confirmed",
      },
      {
        assignmentDate: "2026-09-06",
        typeKey: "per_meeting",
        sectorKey: "banheiro",
        sectorName: "Baño",
        personName: "Luis Pérez",
        isFamily: true,
        status: "draft",
      },
    ]);
  });

  it("retorna vacío y registra el error cuando la consulta falla", async () => {
    mockDb.enqueue(rejected(new Error("join inválido")));

    await expect(listCleaningAssignmentsForDates(["2026-09-01"])).resolves.toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      "[cleaning] falha ao listar limpeza por data",
      expect.objectContaining({ dates: ["2026-09-01"] }),
    );
  });
});

describe("listUpcomingCleaningDates", () => {
  it("retorna las fechas con limpieza a partir de la fecha informada", async () => {
    mockDb.enqueue([{ date: "2026-09-01" }, { date: "2026-09-06" }]);

    await expect(listUpcomingCleaningDates("2026-09-01")).resolves.toEqual([
      "2026-09-01",
      "2026-09-06",
    ]);
  });

  it("respeta el límite informado", async () => {
    mockDb.enqueue([[]]);

    await listUpcomingCleaningDates("2026-09-01", 3);

    expect(mockDb.calls.find((call) => call.fn === "limit")?.args[0]).toBe(3);
  });

  it("retorna vacío y registra el error cuando la consulta falla", async () => {
    mockDb.enqueue(rejected(new Error("join inválido")));

    await expect(listUpcomingCleaningDates("2026-09-01")).resolves.toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      "[cleaning] falha ao listar datas com limpeza",
      expect.objectContaining({ fromDate: "2026-09-01" }),
    );
  });
});

import { mockDb } from "@test/mock-db";
import { getTableName } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireOwnerUser } from "@/features/auth/application/session";
import {
  createCleaningSector,
  deleteCleaningSector,
  restoreDefaultCleaningSectors,
  seedAllCleaningDefaults,
  setCleaningAssignmentMode,
  toggleCleaningSector,
  toggleCleaningType,
  updateCleaningSector,
} from "@/features/cleaning/application/actions";
import {
  CLEANING_SECTORS_DEFAULTS,
  CLEANING_TYPES,
} from "@/features/cleaning/domain/cleaning-defaults";

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

const allTypes = CLEANING_TYPES.map((def) => ({ key: def.key }));

function callsOf(fn: string) {
  return mockDb.calls.filter((call) => call.fn === fn);
}

function tableNameOf(call: { args: unknown[] }): string {
  return getTableName(call.args[0] as Parameters<typeof getTableName>[0]);
}

beforeEach(() => {
  mockDb.reset();
  vi.mocked(requireOwnerUser).mockReset();
  vi.mocked(revalidatePath).mockReset();
  vi.mocked(requireOwnerUser).mockResolvedValue(fakeUser);
});

describe("toggleCleaningType", () => {
  it("rechaza la entrada sin tocar la base ni pedir permiso", async () => {
    const result = await toggleCleaningType({
      key: "otro" as unknown as "per_meeting",
      enabled: true,
    });

    expect(result).toEqual({ ok: false, error: "Tipo de limpieza no válido." });
    expect(vi.mocked(requireOwnerUser)).not.toHaveBeenCalled();
    expect(mockDb.calls).toHaveLength(0);
  });

  it("rechaza cuando no es owner", async () => {
    vi.mocked(requireOwnerUser).mockRejectedValueOnce(new Error("FORBIDDEN"));

    const result = await toggleCleaningType({ key: "per_meeting", enabled: false });

    expect(result).toEqual({ ok: false, error: "Solo el owner puede cambiar." });
    expect(callsOf("insert")).toHaveLength(0);
  });

  it("actualiza el estado de un tipo existente", async () => {
    mockDb.enqueueMany([allTypes, []]);

    const result = await toggleCleaningType({ key: "per_meeting", enabled: true });

    expect(result).toEqual({ ok: true });
    expect(callsOf("select")).toHaveLength(1);
    expect(callsOf("insert")).toHaveLength(1);
    expect(callsOf("onConflictDoUpdate")).toHaveLength(1);
    expect(callsOf("values")[0].args[0]).toMatchObject({
      key: "per_meeting",
      enabled: true,
    });
    expect(tableNameOf(callsOf("insert")[0])).toBe("cleaning_types");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/administracion/configuracion");
  });

  it("siembra los tipos faltantes antes de guardar", async () => {
    mockDb.enqueueMany([[], [], [], [], []]);

    const result = await toggleCleaningType({ key: "weekly", enabled: false });

    expect(result).toEqual({ ok: true });
    expect(callsOf("insert")).toHaveLength(CLEANING_TYPES.length + 1);
    expect(callsOf("onConflictDoUpdate")).toHaveLength(1);
  });
});

describe("setCleaningAssignmentMode", () => {
  it("rechaza el modo inválido", async () => {
    const result = await setCleaningAssignmentMode({
      key: "per_meeting",
      mode: "otro" as unknown as "person",
    });

    expect(result).toEqual({ ok: false, error: "Modo no válido." });
    expect(vi.mocked(requireOwnerUser)).not.toHaveBeenCalled();
  });

  it("guarda el modo de asignación del tipo", async () => {
    mockDb.enqueueMany([allTypes, []]);

    const result = await setCleaningAssignmentMode({ key: "weekly", mode: "group" });

    expect(result).toEqual({ ok: true });
    expect(callsOf("values")[0].args[0]).toMatchObject({
      key: "weekly",
      assignmentMode: "group",
    });
    expect(callsOf("onConflictDoUpdate")).toHaveLength(1);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/administracion/configuracion");
  });
});

describe("createCleaningSector", () => {
  it("rechaza datos inválidos", async () => {
    const result = await createCleaningSector({
      typeKey: "per_meeting",
      name: "",
      task: "Barrer",
      requiredSex: "any",
    });

    expect(result).toEqual({ ok: false, error: "Revisa nombre, tarea y cantidad." });
    expect(vi.mocked(requireOwnerUser)).not.toHaveBeenCalled();
  });

  it("rechaza cuando no es owner", async () => {
    vi.mocked(requireOwnerUser).mockRejectedValueOnce(new Error("FORBIDDEN"));

    const result = await createCleaningSector({
      typeKey: "per_meeting",
      name: "Sala",
      task: "Barrer",
      requiredSex: "any",
    });

    expect(result).toEqual({ ok: false, error: "Solo el owner puede crear sectores." });
    expect(callsOf("insert")).toHaveLength(0);
  });

  it("crea el sector con el siguiente orden y los defaults", async () => {
    mockDb.enqueueMany([allTypes, [{ sortOrder: 0 }, { sortOrder: 2 }], []]);

    const result = await createCleaningSector({
      typeKey: "per_meeting",
      name: "  Sala de limpieza  ",
      task: "  Trapear  ",
      requiredSex: "any",
    });

    expect(result).toEqual({ ok: true });
    const values = callsOf("values")[0].args[0] as Record<string, unknown>;
    expect(values).toMatchObject({
      cleaningTypeKey: "per_meeting",
      key: null,
      name: "Sala de limpieza",
      task: "Trapear",
      enabled: true,
      peopleCount: null,
      requiredSex: "any",
      allowYoung: true,
      isDefault: false,
      sortOrder: 3,
    });
    expect(tableNameOf(callsOf("insert")[0])).toBe("cleaning_sectors");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/administracion/configuracion");
  });
});

describe("updateCleaningSector", () => {
  it("rechaza el id vacío", async () => {
    const result = await updateCleaningSector({
      id: " ",
      name: "Sala",
      task: "Barrer",
      requiredSex: "any",
    });

    expect(result).toEqual({ ok: false, error: "Revisa los datos del sector." });
    expect(vi.mocked(requireOwnerUser)).not.toHaveBeenCalled();
  });

  it("actualiza los datos del sector", async () => {
    mockDb.enqueue([]);

    const result = await updateCleaningSector({
      id: "s1",
      name: "Auditorio",
      task: "Aspirar",
      peopleCount: 2,
      requiredSex: "male",
      allowYoung: false,
    });

    expect(result).toEqual({ ok: true });
    const updateCall = callsOf("update")[0];
    expect(tableNameOf(updateCall)).toBe("cleaning_sectors");
    const setData = callsOf("set")[0].args[0] as Record<string, unknown>;
    expect(setData).toMatchObject({
      name: "Auditorio",
      task: "Aspirar",
      peopleCount: 2,
      requiredSex: "male",
      allowYoung: false,
    });
    expect(setData.updatedAt).toBeInstanceOf(Date);
    expect(callsOf("where")).toHaveLength(1);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/administracion/configuracion");
  });
});

describe("toggleCleaningSector", () => {
  it("rechaza la entrada inválida", async () => {
    const result = await toggleCleaningSector({ id: "", enabled: true });

    expect(result).toEqual({ ok: false, error: "Sector no válido." });
    expect(vi.mocked(requireOwnerUser)).not.toHaveBeenCalled();
  });

  it("cambia el estado del sector", async () => {
    mockDb.enqueue([]);

    const result = await toggleCleaningSector({ id: "s1", enabled: false });

    expect(result).toEqual({ ok: true });
    const setData = callsOf("set")[0].args[0] as Record<string, unknown>;
    expect(setData).toMatchObject({ enabled: false });
    expect(setData.updatedAt).toBeInstanceOf(Date);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/administracion/configuracion");
  });
});

describe("deleteCleaningSector", () => {
  it("rechaza cuando no es owner", async () => {
    vi.mocked(requireOwnerUser).mockRejectedValueOnce(new Error("FORBIDDEN"));

    const result = await deleteCleaningSector({ id: "s1" });

    expect(result).toEqual({ ok: false, error: "Solo el owner puede eliminar." });
    expect(callsOf("delete")).toHaveLength(0);
  });

  it("elimina el sector", async () => {
    mockDb.enqueue([]);

    const result = await deleteCleaningSector({ id: "s1" });

    expect(result).toEqual({ ok: true });
    expect(tableNameOf(callsOf("delete")[0])).toBe("cleaning_sectors");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/administracion/configuracion");
  });
});

describe("restoreDefaultCleaningSectors", () => {
  it("rechaza el tipo inválido", async () => {
    const result = await restoreDefaultCleaningSectors({
      key: "otro" as unknown as "per_meeting",
    });

    expect(result).toEqual({ ok: false, error: "Tipo no válido." });
    expect(vi.mocked(requireOwnerUser)).not.toHaveBeenCalled();
  });

  it("restaura todos los sectores predeterminados del tipo", async () => {
    const expectedCount = CLEANING_SECTORS_DEFAULTS.filter(
      (def) => def.typeKey === "per_meeting",
    ).length;
    mockDb.enqueueMany([allTypes, [], [], ...Array.from({ length: expectedCount }, () => [])]);

    const result = await restoreDefaultCleaningSectors({ key: "per_meeting" });

    expect(result).toEqual({ ok: true, restored: expectedCount });
    const inserted = callsOf("values").map((call) => call.args[0] as Record<string, unknown>);
    expect(inserted).toHaveLength(expectedCount);
    expect(inserted.every((values) => values.isDefault === true)).toBe(true);
    expect(inserted.find((values) => values.key === "banheiro_masculino")).toMatchObject({
      requiredSex: "male",
      allowYoung: false,
    });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/administracion/configuracion");
  });

  it("solo agrega los sectores que faltan", async () => {
    mockDb.enqueueMany([allTypes, [{ key: "auditorio" }], [], [], [], [], []]);

    const result = await restoreDefaultCleaningSectors({ key: "per_meeting" });

    const expectedMissing = CLEANING_SECTORS_DEFAULTS.filter(
      (def) => def.typeKey === "per_meeting" && def.key !== "auditorio",
    ).length;
    expect(result).toEqual({ ok: true, restored: expectedMissing });
    expect(callsOf("values")).toHaveLength(expectedMissing);
  });
});

describe("seedAllCleaningDefaults", () => {
  it("rechaza cuando no es owner", async () => {
    vi.mocked(requireOwnerUser).mockRejectedValueOnce(new Error("FORBIDDEN"));

    const result = await seedAllCleaningDefaults();

    expect(result).toEqual({
      ok: false,
      error: "Solo el owner puede restaurar los predeterminados.",
    });
    expect(callsOf("insert")).toHaveLength(0);
  });

  it("restaura los sectores predeterminados de todos los tipos", async () => {
    const queue: unknown[] = [allTypes];
    for (const def of CLEANING_TYPES) {
      queue.push(allTypes, [], []);
      const count = CLEANING_SECTORS_DEFAULTS.filter((sector) => sector.typeKey === def.key).length;
      for (let index = 0; index < count; index++) queue.push([]);
    }
    mockDb.enqueueMany(queue);

    const result = await seedAllCleaningDefaults();

    expect(result).toEqual({ ok: true });
    expect(mockDb.pending).toBe(0);
    expect(callsOf("insert")).toHaveLength(CLEANING_SECTORS_DEFAULTS.length);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledTimes(CLEANING_TYPES.length);
  });
});

import { mockDb } from "@test/mock-db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requirePrivilegedUser } from "@/features/auth/application/session";
import {
  getCleaningSectorRule,
  isPersonEligibleForCleaning,
  listCleaningConfig,
  listEnabledDesignationFlags,
} from "@/features/cleaning/application/queries";
import { CLEANING_TYPES } from "@/features/cleaning/domain/cleaning-defaults";

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

beforeEach(() => {
  mockDb.reset();
  vi.mocked(requirePrivilegedUser).mockReset();
  vi.mocked(requirePrivilegedUser).mockResolvedValue(fakeUser);
});

describe("listCleaningConfig", () => {
  it("retorna los tipos predeterminados cuando las tablas están vacías", async () => {
    const config = await listCleaningConfig();

    expect(config.map((type) => type.key)).toEqual(["per_meeting", "weekly", "general"]);
    expect(config[0].sectors[0]).toMatchObject({
      id: "default-per_meeting-auditorio",
      key: "auditorio",
      enabled: true,
      isDefault: true,
      allowYoung: true,
    });
    expect(config[0].assignmentMode).toBe("person");
    expect(
      config[0].sectors.find((sector) => sector.key === "banheiro_masculino")?.allowYoung,
    ).toBe(false);
    expect(mockDb.calls.filter((call) => call.fn === "select")).toHaveLength(2);
    expect(mockDb.calls.some((call) => call.fn === "insert")).toBe(false);
    expect(vi.mocked(requirePrivilegedUser)).toHaveBeenCalledTimes(1);
  });

  it("mapea los tipos de la base y agrupa los sectores por tipo", async () => {
    const typeRows = [
      { key: "per_meeting", enabled: false, assignmentMode: "family" },
      { key: "weekly", enabled: true, assignmentMode: "group" },
    ];
    const sectorRows = [
      {
        id: "s1",
        cleaningTypeKey: "per_meeting",
        key: "auditorio",
        name: "Auditorio",
        task: "Barrer el suelo",
        enabled: true,
        peopleCount: 2,
        requiredSex: "male",
        allowYoung: false,
        isDefault: false,
        sortOrder: 1,
      },
    ];
    mockDb.enqueueMany([typeRows, sectorRows]);

    const config = await listCleaningConfig();

    expect(config).toHaveLength(3);
    expect(config[0]).toMatchObject({
      key: "per_meeting",
      enabled: false,
      assignmentMode: "family",
      sectors: [
        {
          id: "s1",
          key: "auditorio",
          name: "Auditorio",
          task: "Barrer el suelo",
          enabled: true,
          peopleCount: 2,
          requiredSex: "male",
          allowYoung: false,
          isDefault: false,
          sortOrder: 1,
        },
      ],
    });
    expect(config[2]).toMatchObject({
      key: "general",
      enabled: true,
      assignmentMode: "person",
      sectors: [],
    });
  });

  it("retorna los tipos predeterminados cuando la base falla", async () => {
    mockDb.enqueue(rejected(new Error("relation does not exist")));

    const config = await listCleaningConfig();

    expect(config.map((type) => type.key)).toEqual(CLEANING_TYPES.map((type) => type.key));
    expect(config[0].sectors.every((sector) => sector.id.startsWith("default-"))).toBe(true);
    expect(mockDb.calls.some((call) => call.fn === "insert")).toBe(false);
  });

  it("propaga el error de autenticación", async () => {
    vi.mocked(requirePrivilegedUser).mockRejectedValueOnce(new Error("FORBIDDEN"));

    await expect(listCleaningConfig()).rejects.toThrow("FORBIDDEN");
  });
});

describe("listEnabledDesignationFlags", () => {
  it("retorna solo las banderas habilitadas con bandera de persona", async () => {
    mockDb.enqueue([
      { personFlag: "usher", enabled: true },
      { personFlag: "sound", enabled: false },
      { personFlag: null, enabled: true },
      { personFlag: "platform", enabled: true },
    ]);

    await expect(listEnabledDesignationFlags()).resolves.toEqual(["usher", "platform"]);
  });

  it("retorna las banderas predeterminadas con la tabla vacía", async () => {
    await expect(listEnabledDesignationFlags()).resolves.toEqual([
      "usher",
      "sound",
      "video",
      "microphone",
      "platform",
    ]);
  });

  it("retorna las banderas predeterminadas cuando la consulta falla", async () => {
    mockDb.enqueue(rejected(new Error("relation does not exist")));

    await expect(listEnabledDesignationFlags()).resolves.toEqual([
      "usher",
      "sound",
      "video",
      "microphone",
      "platform",
    ]);
  });
});

describe("isPersonEligibleForCleaning", () => {
  it("rechaza a quien no está habilitado para limpieza", () => {
    expect(
      isPersonEligibleForCleaning(
        { sex: "male", cleaning: false },
        { peopleCount: null, requiredSex: "any", allowYoung: true },
      ),
    ).toBe(false);
  });

  it("respeta el sexo requerido por el sector", () => {
    const rule = { peopleCount: 1, requiredSex: "female", allowYoung: true } as const;

    expect(isPersonEligibleForCleaning({ sex: "male", cleaning: true }, rule)).toBe(false);
    expect(isPersonEligibleForCleaning({ sex: "female", cleaning: true }, rule)).toBe(true);
  });

  it("excluye jóvenes del sector solo-adulto salvo relajación", () => {
    const rule = { peopleCount: 1, requiredSex: "any", allowYoung: false } as const;

    expect(isPersonEligibleForCleaning({ sex: "male", cleaning: true, young: true }, rule)).toBe(
      false,
    );
    expect(
      isPersonEligibleForCleaning({ sex: "male", cleaning: true, young: true }, rule, true),
    ).toBe(true);
  });
});

describe("getCleaningSectorRule", () => {
  it("responde con la regla predeterminada sin consultar la base", async () => {
    const rule = await getCleaningSectorRule("default-per_meeting-auditorio");

    expect(rule).toEqual({ peopleCount: null, requiredSex: "any", allowYoung: true });
    expect(mockDb.calls).toHaveLength(0);
  });

  it("lee la regla del sector en la base", async () => {
    mockDb.enqueue([{ peopleCount: 3, requiredSex: "male", allowYoung: false }]);

    await expect(getCleaningSectorRule("s1")).resolves.toEqual({
      peopleCount: 3,
      requiredSex: "male",
      allowYoung: false,
    });
  });

  it("trata allowYoung ausente como true", async () => {
    mockDb.enqueue([{ peopleCount: 1, requiredSex: "any", allowYoung: null }]);

    await expect(getCleaningSectorRule("s1")).resolves.toEqual({
      peopleCount: 1,
      requiredSex: "any",
      allowYoung: true,
    });
  });

  it("devuelve null cuando el sector no existe", async () => {
    mockDb.enqueue([]);

    await expect(getCleaningSectorRule("s1")).resolves.toBeNull();
  });

  it("devuelve null cuando la consulta falla", async () => {
    mockDb.enqueue(rejected(new Error("relation does not exist")));

    await expect(getCleaningSectorRule("s1")).resolves.toBeNull();
  });
});

import { mockDb } from "@test/mock-db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requirePrivilegedUser } from "@/features/auth/application/session";
import {
  listDesignationConfig,
  listEnabledDesignationSectors,
} from "@/features/designations/application/queries";
import { DESIGNATION_SECTORS_DEFAULTS } from "@/features/designations/domain/designation-defaults";

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

describe("listDesignationConfig", () => {
  it("retorna los sectores predeterminados con la tabla vacía", async () => {
    const config = await listDesignationConfig();

    expect(config).toHaveLength(DESIGNATION_SECTORS_DEFAULTS.length);
    expect(config[0]).toMatchObject({
      id: "default-acomodadores",
      key: "acomodadores",
      name: "Acomodadores",
      personFlag: "usher",
      enabled: true,
      peopleCount: 2,
      isDefault: true,
      slots: [
        { id: "default-acomodadores-slot-0", label: "Sector A" },
        { id: "default-acomodadores-slot-1", label: "Sector B" },
      ],
    });
    expect(config.every((sector) => sector.id.startsWith("default-"))).toBe(true);
    expect(mockDb.calls.filter((call) => call.fn === "select")).toHaveLength(2);
    expect(mockDb.calls.some((call) => call.fn === "insert")).toBe(false);
    expect(vi.mocked(requirePrivilegedUser)).toHaveBeenCalledTimes(1);
  });

  it("agrupa los slots por sector", async () => {
    const sectorRows = [
      {
        id: "s1",
        key: "acomodadores",
        name: "Acomodadores",
        personFlag: "usher",
        enabled: false,
        peopleCount: 3,
        isDefault: false,
        sortOrder: 0,
      },
      {
        id: "s2",
        key: "personalizado",
        name: "Personalizado",
        personFlag: null,
        enabled: true,
        peopleCount: null,
        isDefault: false,
        sortOrder: 1,
      },
    ];
    const slotRows = [
      { id: "sl1", sectorId: "s1", label: "Izquierda", sortOrder: 0 },
      { id: "sl2", sectorId: "s1", label: "Derecha", sortOrder: 1 },
    ];
    mockDb.enqueueMany([sectorRows, slotRows]);

    const config = await listDesignationConfig();

    expect(config).toHaveLength(2);
    expect(config[0]).toMatchObject({
      id: "s1",
      enabled: false,
      peopleCount: 3,
      isDefault: false,
      slots: [
        { id: "sl1", label: "Izquierda" },
        { id: "sl2", label: "Derecha" },
      ],
    });
    expect(config[1]).toMatchObject({
      id: "s2",
      personFlag: null,
      slots: [],
    });
  });

  it("retorna los sectores predeterminados cuando la base falla", async () => {
    mockDb.enqueue(rejected(new Error("relation does not exist")));

    const config = await listDesignationConfig();

    expect(config.map((sector) => sector.key)).toEqual(
      DESIGNATION_SECTORS_DEFAULTS.map((def) => def.key),
    );
    expect(config[0].slots).toEqual([
      { id: "default-acomodadores-slot-0", label: "Sector A" },
      { id: "default-acomodadores-slot-1", label: "Sector B" },
    ]);
  });

  it("propaga el error de autenticación", async () => {
    vi.mocked(requirePrivilegedUser).mockRejectedValueOnce(new Error("FORBIDDEN"));

    await expect(listDesignationConfig()).rejects.toThrow("FORBIDDEN");
  });
});

describe("listEnabledDesignationSectors", () => {
  it("filtra los sectores desactivados", async () => {
    const sectorRows = [
      {
        id: "s1",
        key: "acomodadores",
        name: "Acomodadores",
        personFlag: "usher",
        enabled: false,
        peopleCount: 2,
        isDefault: true,
        sortOrder: 0,
      },
      {
        id: "s2",
        key: "som",
        name: "Sonido",
        personFlag: "sound",
        enabled: true,
        peopleCount: 1,
        isDefault: true,
        sortOrder: 1,
      },
    ];
    mockDb.enqueueMany([sectorRows, []]);

    const sectors = await listEnabledDesignationSectors();

    expect(sectors.map((sector) => sector.id)).toEqual(["s2"]);
  });

  it("retorna todos los predeterminados cuando la tabla está vacía", async () => {
    const sectors = await listEnabledDesignationSectors();

    expect(sectors).toHaveLength(DESIGNATION_SECTORS_DEFAULTS.length);
    expect(sectors.every((sector) => sector.enabled)).toBe(true);
  });
});

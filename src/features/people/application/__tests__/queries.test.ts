import { mockDb } from "@test/mock-db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  requireAuthenticatedUser,
  requirePrivilegedUser,
} from "@/features/auth/application/session";
import {
  getPerson,
  getPersonByUserId,
  listPersonOptions,
  listPersons,
  listUserOptions,
  listUsersWithRoles,
} from "@/features/people/application/queries";

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

beforeEach(() => {
  mockDb.reset();
  vi.mocked(requirePrivilegedUser).mockReset();
  vi.mocked(requireAuthenticatedUser).mockReset();
  vi.mocked(requirePrivilegedUser).mockResolvedValue(fakeUser);
  vi.mocked(requireAuthenticatedUser).mockResolvedValue(fakeUser);
});

describe("getPersonByUserId", () => {
  it("retorna la persona vinculada al usuario", async () => {
    mockDb.enqueue([{ id: "p1", firstName: "Ana", lastName: "Pérez", sex: "female" }]);

    await expect(getPersonByUserId("u1")).resolves.toEqual({
      id: "p1",
      firstName: "Ana",
      lastName: "Pérez",
      sex: "female",
    });
    expect(vi.mocked(requireAuthenticatedUser)).toHaveBeenCalledTimes(1);
  });

  it("retorna null sin persona vinculada", async () => {
    mockDb.enqueue([]);

    await expect(getPersonByUserId("u9")).resolves.toBeNull();
  });
});

describe("listPersons", () => {
  it("retorna el resumen de personas", async () => {
    const rows = [
      { id: "p1", firstName: "Ana", lastName: "Pérez", sex: "female" },
      { id: "p2", firstName: "Luis", lastName: "Pérez", sex: "male" },
    ];
    mockDb.enqueue(rows);

    await expect(listPersons()).resolves.toEqual(rows);
    expect(mockDb.calls.some((call) => call.fn === "orderBy")).toBe(true);
    expect(vi.mocked(requirePrivilegedUser)).toHaveBeenCalledTimes(1);
  });
});

describe("getPerson", () => {
  it("retorna la persona completa por id", async () => {
    const row = {
      id: "p1",
      firstName: "Ana",
      lastName: "Pérez",
      sex: "female",
      familyHead: true,
      cleaning: true,
      young: false,
      baptized: true,
    };
    mockDb.enqueue([row]);

    await expect(getPerson("p1")).resolves.toEqual(row);
  });

  it("retorna null cuando no existe", async () => {
    mockDb.enqueue([]);

    await expect(getPerson("p9")).resolves.toBeNull();
  });
});

describe("listPersonOptions", () => {
  it("monta etiquetas con el nombre completo de los jefes de familia", async () => {
    mockDb.enqueue([
      { id: "p1", firstName: "Ana", lastName: "Pérez" },
      { id: "p2", firstName: "Luis", lastName: "Gómez" },
    ]);

    const options = await listPersonOptions();

    expect(options).toEqual([
      { id: "p1", label: "Ana Pérez" },
      { id: "p2", label: "Luis Gómez" },
    ]);
  });

  it("excluye el id informado", async () => {
    mockDb.enqueue([{ id: "p2", firstName: "Luis", lastName: "Gómez" }]);

    const options = await listPersonOptions("p1");

    expect(options).toEqual([{ id: "p2", label: "Luis Gómez" }]);
    expect(mockDb.calls.find((call) => call.fn === "where")?.args[0]).toBeDefined();
  });
});

describe("listUsersWithRoles", () => {
  it("vincula el nombre de la persona asociada", async () => {
    mockDb.enqueueMany([
      [
        { id: "u1", name: "Owner", email: "owner@example.com", role: "owner" },
        { id: "u2", name: "Miembro", email: "member@example.com", role: "member" },
      ],
      [{ userId: "u1", firstName: "Ana", lastName: "Pérez" }],
    ]);

    const users = await listUsersWithRoles();

    expect(users).toEqual([
      {
        id: "u1",
        name: "Owner",
        email: "owner@example.com",
        role: "owner",
        linkedPersonName: "Ana Pérez",
      },
      {
        id: "u2",
        name: "Miembro",
        email: "member@example.com",
        role: "member",
        linkedPersonName: null,
      },
    ]);
    expect(mockDb.calls.filter((call) => call.fn === "select")).toHaveLength(2);
  });

  it("ignora las personas sin usuario vinculado", async () => {
    mockDb.enqueueMany([
      [{ id: "u1", name: "Owner", email: "owner@example.com", role: "owner" }],
      [
        { userId: null, firstName: "Sin", lastName: "Usuario" },
        { userId: "u1", firstName: "Ana", lastName: "Pérez" },
      ],
    ]);

    const users = await listUsersWithRoles();

    expect(users[0].linkedPersonName).toBe("Ana Pérez");
  });
});

describe("listUserOptions", () => {
  it("monta etiquetas con nombre y correo", async () => {
    mockDb.enqueue([
      { id: "u1", name: "Owner", email: "owner@example.com" },
      { id: "u2", name: "Miembro", email: "member@example.com" },
    ]);

    const options = await listUserOptions();

    expect(options).toEqual([
      { id: "u1", label: "Owner (owner@example.com)" },
      { id: "u2", label: "Miembro (member@example.com)" },
    ]);
  });

  it("incluye el usuario de la persona vinculada cuando se informa", async () => {
    mockDb.enqueue([{ id: "u1", name: "Owner", email: "owner@example.com" }]);

    const options = await listUserOptions("p1");

    expect(options).toEqual([{ id: "u1", label: "Owner (owner@example.com)" }]);
    expect(mockDb.calls.find((call) => call.fn === "where")?.args[0]).toBeDefined();
  });
});

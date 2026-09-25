import { mockDb } from "@test/mock-db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAuthenticatedUser, requireOwnerUser } from "@/features/auth/application/session";
import {
  getMyJoinToken,
  isUserAssociated,
  listActiveJoinTokenCodes,
  listInvitations,
} from "@/features/organization/application/organization-queries";

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

const owner = { id: "u1", email: "owner@example.com", name: "Owner", role: "owner" as const };
const future = new Date(Date.now() + 86400000);
const past = new Date(Date.now() - 86400000);

beforeEach(() => {
  mockDb.reset();
  vi.mocked(requireOwnerUser).mockReset();
  vi.mocked(requireAuthenticatedUser).mockReset();
  vi.mocked(requireOwnerUser).mockResolvedValue(owner);
  vi.mocked(requireAuthenticatedUser).mockResolvedValue({
    id: "u2",
    email: "ana@example.com",
    name: "Ana",
    role: "member" as const,
  });
});

describe("listInvitations", () => {
  it("mapeia os convites com datas em ISO", async () => {
    mockDb.enqueue([
      {
        id: "inv1",
        email: "ana@example.com",
        role: "admin",
        status: "pending",
        expiresAt: future,
        createdAt: past,
      },
    ]);
    const result = await listInvitations();
    expect(result).toEqual([
      {
        id: "inv1",
        email: "ana@example.com",
        role: "admin",
        status: "pending",
        expiresAt: future.toISOString(),
        createdAt: past.toISOString(),
      },
    ]);
  });

  it("exige owner", async () => {
    vi.mocked(requireOwnerUser).mockRejectedValueOnce(new Error("FORBIDDEN"));
    await expect(listInvitations()).rejects.toThrow("FORBIDDEN");
  });
});

describe("listActiveJoinTokenCodes", () => {
  it("filtra usados e vencidos", async () => {
    mockDb.enqueue([
      { userId: "u2", code: "AAA-BBB-CCC", usedAt: null, expiresAt: future },
      { userId: "u3", code: "DDD-EEE-FFF", usedAt: new Date(), expiresAt: future },
      { userId: "u4", code: "GGG-HHH-JJJ", usedAt: null, expiresAt: past },
    ]);
    const result = await listActiveJoinTokenCodes();
    expect(result).toEqual([
      { userId: "u2", code: "AAA-BBB-CCC", expiresAt: future.toISOString() },
    ]);
  });

  it("exige owner", async () => {
    vi.mocked(requireOwnerUser).mockRejectedValueOnce(new Error("FORBIDDEN"));
    await expect(listActiveJoinTokenCodes()).rejects.toThrow("FORBIDDEN");
  });
});

describe("getMyJoinToken", () => {
  it("devolve null sem código, usado ou vencido", async () => {
    mockDb.enqueue([]);
    expect(await getMyJoinToken()).toBeNull();
    mockDb.enqueue([{ code: "AAA-BBB-CCC", usedAt: new Date(), expiresAt: future }]);
    expect(await getMyJoinToken()).toBeNull();
    mockDb.enqueue([{ code: "AAA-BBB-CCC", usedAt: null, expiresAt: past }]);
    expect(await getMyJoinToken()).toBeNull();
  });

  it("devolve o código ativo", async () => {
    mockDb.enqueue([{ code: "AAA-BBB-CCC", usedAt: null, expiresAt: future }]);
    expect(await getMyJoinToken()).toEqual({
      code: "AAA-BBB-CCC",
      expiresAt: future.toISOString(),
    });
  });
});

describe("isUserAssociated", () => {
  it("associa owner e admin pelo papel sem consultar vínculos", async () => {
    expect(await isUserAssociated(owner)).toBe(true);
    expect(await isUserAssociated({ id: "u3", role: "admin" })).toBe(true);
    expect(mockDb.calls).toHaveLength(0);
  });

  it("exige vínculo na tabela member para membro", async () => {
    mockDb.enqueue([{ id: "m1" }]);
    expect(await isUserAssociated({ id: "u2", role: "member" })).toBe(true);
    mockDb.enqueue([]);
    expect(await isUserAssociated({ id: "u2", role: "member" })).toBe(false);
  });
});

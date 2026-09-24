import { mockDb } from "@test/mock-db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentUser,
  requireAuthenticatedUser,
  requireOwnerUser,
  requirePrivilegedUser,
} from "@/features/auth/application/session";
import { users } from "@/features/auth/infrastructure/user-schema";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/features/auth/infrastructure/better-auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));
vi.mock("@/shared/lib/db", async () => {
  const { mockDb } = await import("@test/mock-db");
  return { getDb: () => mockDb.database };
});

const anaMember = {
  id: "u1",
  email: "ana@example.com",
  name: "Ana Torres",
  image: null,
  role: "member" as const,
};

function givenSession(): void {
  getSessionMock.mockResolvedValue({ user: { id: "u1" } });
}

function givenUserRow(role: string): void {
  mockDb.enqueue([{ id: "u1", email: "ana@example.com", name: "Ana Torres", image: null, role }]);
}

beforeEach(() => {
  mockDb.reset();
  vi.resetAllMocks();
});

describe("getCurrentUser", () => {
  it("retorna null quando não há sessão", async () => {
    getSessionMock.mockResolvedValue(null);
    expect(await getCurrentUser()).toBeNull();
    expect(mockDb.calls).toHaveLength(0);
  });

  it("retorna null quando a sessão não tem usuário", async () => {
    getSessionMock.mockResolvedValue({ session: { id: "s1" } });
    expect(await getCurrentUser()).toBeNull();
  });

  it("retorna null quando o select não devolve linha", async () => {
    givenSession();
    mockDb.enqueue([]);
    expect(await getCurrentUser()).toBeNull();
  });

  it("retorna null quando o banco está inacessível", async () => {
    givenSession();
    mockDb.enqueue(Promise.reject(new Error("neon unreachable")));
    expect(await getCurrentUser()).toBeNull();
  });

  it("lê a linha na tabela users e devolve o usuário", async () => {
    givenSession();
    givenUserRow("owner");
    expect(await getCurrentUser()).toEqual({ ...anaMember, role: "owner" });
    expect(getSessionMock).toHaveBeenCalledWith({ headers: expect.any(Headers) });
    expect(mockDb.calls.some((call) => call.fn === "from" && call.args[0] === users)).toBe(true);
  });

  it("normaliza papel desconhecido para member", async () => {
    givenSession();
    givenUserRow("lixo");
    expect(await getCurrentUser()).toEqual(anaMember);
  });
});

describe("requireAuthenticatedUser", () => {
  it("lança UNAUTHORIZED sem sessão", async () => {
    getSessionMock.mockResolvedValue(null);
    await expect(requireAuthenticatedUser()).rejects.toThrow("UNAUTHORIZED");
  });

  it("devolve o usuário autenticado", async () => {
    givenSession();
    givenUserRow("member");
    await expect(requireAuthenticatedUser()).resolves.toEqual(anaMember);
  });
});

describe("requirePrivilegedUser", () => {
  it("lança FORBIDDEN para member", async () => {
    givenSession();
    givenUserRow("member");
    await expect(requirePrivilegedUser()).rejects.toThrow("FORBIDDEN");
  });

  it("devolve admin", async () => {
    givenSession();
    givenUserRow("admin");
    await expect(requirePrivilegedUser()).resolves.toEqual({ ...anaMember, role: "admin" });
  });
});

describe("requireOwnerUser", () => {
  it("lança FORBIDDEN para admin", async () => {
    givenSession();
    givenUserRow("admin");
    await expect(requireOwnerUser()).rejects.toThrow("FORBIDDEN");
  });

  it("devolve owner", async () => {
    givenSession();
    givenUserRow("owner");
    await expect(requireOwnerUser()).resolves.toEqual({ ...anaMember, role: "owner" });
  });
});

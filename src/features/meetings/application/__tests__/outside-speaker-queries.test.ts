import { mockDb } from "@test/mock-db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requirePrivilegedUser } from "@/features/auth/application/session";
import type { AuthUser } from "@/features/auth/domain/user";
import { listOutsideSpeakers } from "@/features/meetings/application/outside-speaker-queries";

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

beforeEach(() => {
  mockDb.reset();
  vi.clearAllMocks();
  vi.mocked(requirePrivilegedUser).mockResolvedValue(user);
});

describe("listOutsideSpeakers", () => {
  it("exige usuario privilegiado", async () => {
    vi.mocked(requirePrivilegedUser).mockRejectedValue(new Error("FORBIDDEN"));
    await expect(listOutsideSpeakers()).rejects.toThrow("FORBIDDEN");
    expect(mockDb.calls).toEqual([]);
  });

  it("lista oradores con sus discursos agrupados", async () => {
    mockDb.enqueueMany([
      [],
      [
        {
          id: "s1",
          name: "Carlos Ruiz",
          congregation: "Centro",
          talkNumber: null,
          talkTheme: "",
          phone: "111",
          notes: "n1",
        },
        {
          id: "s2",
          name: "Ana Solís",
          congregation: "Norte",
          talkNumber: 45,
          talkTheme: "Tema legado",
          phone: null,
          notes: null,
        },
      ],
      [
        { id: "t2", speakerId: "s1", talkNumber: 20, talkTheme: "Segundo discurso" },
        { id: "t1", speakerId: "s1", talkNumber: 10, talkTheme: "Primer discurso" },
        { id: "t3", speakerId: "s3", talkNumber: 5, talkTheme: "Ajeno" },
      ],
    ]);
    const items = await listOutsideSpeakers();
    expect(requirePrivilegedUser).toHaveBeenCalledTimes(1);
    expect(mockDb.calls.map((call) => call.fn)).toEqual([
      "execute",
      "select",
      "from",
      "orderBy",
      "select",
      "from",
      "orderBy",
    ]);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      id: "s1",
      name: "Carlos Ruiz",
      congregation: "Centro",
      talkNumber: null,
      talkTheme: "",
      phone: "111",
      notes: "n1",
      talks: [
        { id: "t2", talkNumber: 20, talkTheme: "Segundo discurso" },
        { id: "t1", talkNumber: 10, talkTheme: "Primer discurso" },
      ],
    });
    expect(items[1]?.talks).toEqual([{ id: "legacy", talkNumber: 45, talkTheme: "Tema legado" }]);
    expect(items[1]?.phone).toBe("");
    expect(items[1]?.notes).toBe("");
    expect(mockDb.pending).toBe(0);
  });

  it("usa el discurso legado cuando la tabla nueva está vacía", async () => {
    mockDb.enqueueMany([
      [],
      [
        {
          id: "s1",
          name: "Luis Vargas",
          congregation: "",
          talkNumber: 12,
          talkTheme: "Discurso público",
          phone: "",
          notes: "",
        },
      ],
      [],
    ]);
    const items = await listOutsideSpeakers();
    expect(items[0]?.talks).toEqual([
      { id: "legacy", talkNumber: 12, talkTheme: "Discurso público" },
    ]);
  });

  it("devuelve lista vacía cuando no hay oradores", async () => {
    mockDb.enqueueMany([[], [], []]);
    await expect(listOutsideSpeakers()).resolves.toEqual([]);
    expect(mockDb.pending).toBe(0);
  });
});

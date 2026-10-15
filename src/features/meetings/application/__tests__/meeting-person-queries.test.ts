import { mockDb } from "@test/mock-db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAuthenticatedUser } from "@/features/auth/application/session";
import { listMeetingPersons } from "@/features/meetings/application/meeting-person-queries";

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

function personRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    firstName: "Ana",
    lastName: "Silva",
    sex: "female",
    helper: true,
    unavailable: false,
    lastAssignmentAt: null,
    familyHead: false,
    familyMemberId: null,
    ...overrides,
  };
}

beforeEach(() => {
  mockDb.reset();
  vi.resetAllMocks();
  vi.mocked(requireAuthenticatedUser).mockResolvedValue({
    id: "user-1",
    email: "a@b.c",
    name: "Prueba",
    image: null,
    role: "admin",
  });
});

describe("listMeetingPersons (rodízio por função)", () => {
  it("ordena do mais antigo ao mais novo, com quem nunca exerceu primeiro", async () => {
    mockDb.enqueueMany([
      [
        personRow({
          id: "a",
          firstName: "Ana",
          lastAssignmentAt: new Date("2026-01-05T00:00:00Z"),
        }),
        personRow({
          id: "b",
          firstName: "Bruno",
          lastAssignmentAt: new Date("2026-01-06T00:00:00Z"),
        }),
        personRow({ id: "c", firstName: "Carla", lastAssignmentAt: null }),
      ],
      [
        { personId: "a", lastDate: "2026-09-01" },
        { personId: "b", lastDate: "2026-10-01" },
      ],
    ]);
    const people = await listMeetingPersons("publicChairman", {
      orderBy: "rotation",
      rotationScope: { partKeys: ["president"], kinds: ["weekend"] },
    });
    expect(people.map((person) => person.id)).toEqual(["c", "a", "b"]);
    expect(people.map((person) => person.lastAssignmentAt)).toEqual([
      null,
      "2026-09-01",
      "2026-10-01",
    ]);
    // Histórico lido com join + agrupamento; SQL sem limite (fatia após ordenar).
    const fns = mockDb.calls.map((call) => call.fn);
    expect(fns).toContain("innerJoin");
    expect(fns).toContain("groupBy");
    expect(fns.filter((fn) => fn === "limit")).toHaveLength(0);
    expect(mockDb.pending).toBe(0);
  });

  it("leitor usa o histórico de ajudante da parte de estudo", async () => {
    mockDb.enqueueMany([
      [personRow({ id: "a", firstName: "Ana" }), personRow({ id: "b", firstName: "Bruno" })],
      [{ personId: "b", lastDate: "2026-08-15" }],
    ]);
    const people = await listMeetingPersons("watchtowerReader", {
      orderBy: "rotation",
      rotationScope: { partKeys: ["watchtower-study"], holder: "helper" },
    });
    expect(people.map((person) => person.id)).toEqual(["a", "b"]);
    expect(people[1]?.lastAssignmentAt).toBe("2026-08-15");
    expect(mockDb.calls.map((call) => call.fn)).toContain("innerJoin");
    expect(mockDb.pending).toBe(0);
  });

  it("sem escopo mantém o rodízio global e o limite SQL", async () => {
    mockDb.enqueue([
      personRow({ id: "a", firstName: "Ana", lastAssignmentAt: new Date("2026-05-01T00:00:00Z") }),
    ]);
    const people = await listMeetingPersons("publicChairman", { orderBy: "rotation" });
    expect(people).toHaveLength(1);
    expect(people[0]?.lastAssignmentAt).toBe("2026-05-01T00:00:00.000Z");
    const fns = mockDb.calls.map((call) => call.fn);
    expect(fns).not.toContain("innerJoin");
    expect(fns).not.toContain("groupBy");
    expect(fns.filter((fn) => fn === "limit")).toHaveLength(1);
    expect(mockDb.pending).toBe(0);
  });

  it("escopo sem orderBy rotation não busca histórico", async () => {
    mockDb.enqueue([personRow({ id: "a", firstName: "Ana" })]);
    const people = await listMeetingPersons("publicChairman", {
      orderBy: "name",
      rotationScope: { partKeys: ["president"], kinds: ["weekend"] },
    });
    expect(people).toHaveLength(1);
    expect(mockDb.calls.map((call) => call.fn)).not.toContain("innerJoin");
    expect(mockDb.pending).toBe(0);
  });
});

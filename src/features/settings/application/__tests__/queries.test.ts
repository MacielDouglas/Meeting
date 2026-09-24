import { mockDb } from "@test/mock-db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requirePrivilegedUser } from "@/features/auth/application/session";
import {
  getMeetingSchedule,
  listScheduleExceptions,
  listSpecialEvents,
} from "@/features/settings/application/queries";
import { DEFAULT_MEETING_SCHEDULE } from "@/features/settings/domain/settings";
import {
  meetingSettings,
  scheduleExceptions,
  specialEvents,
} from "@/features/settings/infrastructure/settings-schema";

vi.mock("@/shared/lib/db", async () => {
  const { mockDb } = await import("@test/mock-db");
  return { getDb: () => mockDb.database };
});
vi.mock("@/features/auth/application/session", () => ({
  getCurrentUser: vi.fn(),
  requirePrivilegedUser: vi.fn(),
}));

const admin = {
  id: "u1",
  email: "admin@example.com",
  name: "Ola Admin",
  image: null,
  role: "admin" as const,
};

beforeEach(() => {
  mockDb.reset();
  vi.resetAllMocks();
});

describe("getMeetingSchedule", () => {
  it("devolve o horário padrão quando não há linha salva", async () => {
    mockDb.enqueue([]);
    expect(await getMeetingSchedule()).toEqual(DEFAULT_MEETING_SCHEDULE);
  });

  it("mapeia a linha salva para o horário da congregação", async () => {
    mockDb.enqueue([
      {
        congregationName: "Cong. Centro",
        midweekDay: 3,
        midweekTime: "20:00",
        weekendDay: 6,
        weekendTime: "09:00",
      },
    ]);
    expect(await getMeetingSchedule()).toEqual({
      congregationName: "Cong. Centro",
      midweekDay: 3,
      midweekTime: "20:00",
      weekendDay: 6,
      weekendTime: "09:00",
    });
    expect(
      mockDb.calls.some((call) => call.fn === "from" && call.args[0] === meetingSettings),
    ).toBe(true);
  });

  it("prende o dia fora de 0..6 no intervalo válido", async () => {
    mockDb.enqueue([
      {
        congregationName: "",
        midweekDay: 12,
        midweekTime: "19:30",
        weekendDay: -4,
        weekendTime: "10:00",
      },
    ]);
    expect(await getMeetingSchedule()).toEqual({
      congregationName: "",
      midweekDay: 6,
      midweekTime: "19:30",
      weekendDay: 0,
      weekendTime: "10:00",
    });
  });

  it("cai no select sem o nome da congregação quando o primeiro select lança", async () => {
    mockDb.enqueue(Promise.reject(new Error('column "congregation_name" does not exist')));
    mockDb.enqueue([{ midweekDay: 4, midweekTime: "18:30", weekendDay: 5, weekendTime: "17:00" }]);
    expect(await getMeetingSchedule()).toEqual({
      congregationName: "",
      midweekDay: 4,
      midweekTime: "18:30",
      weekendDay: 5,
      weekendTime: "17:00",
    });
    expect(mockDb.calls.filter((call) => call.fn === "select")).toHaveLength(2);
  });
});

describe("listSpecialEvents", () => {
  it("exige usuário privilegiado e devolve as linhas", async () => {
    vi.mocked(requirePrivilegedUser).mockResolvedValue(admin);
    mockDb.enqueue([
      {
        id: "ev-1",
        type: "circuit_assembly",
        title: "Asamblea con Viajante",
        startDate: "2026-10-03",
        endDate: null,
        startTime: "09:00",
        notes: null,
      },
    ]);
    expect(await listSpecialEvents()).toEqual([
      {
        id: "ev-1",
        type: "circuit_assembly",
        title: "Asamblea con Viajante",
        startDate: "2026-10-03",
        endDate: null,
        startTime: "09:00",
        notes: null,
      },
    ]);
    expect(vi.mocked(requirePrivilegedUser)).toHaveBeenCalledTimes(1);
    expect(mockDb.calls.some((call) => call.fn === "from" && call.args[0] === specialEvents)).toBe(
      true,
    );
  });

  it("propaga o erro de autenticação privilegiada", async () => {
    vi.mocked(requirePrivilegedUser).mockRejectedValue(new Error("FORBIDDEN"));
    await expect(listSpecialEvents()).rejects.toThrow("FORBIDDEN");
    expect(mockDb.calls).toHaveLength(0);
  });
});

describe("listScheduleExceptions", () => {
  it("exige usuário privilegiado e devolve as linhas", async () => {
    vi.mocked(requirePrivilegedUser).mockResolvedValue(admin);
    mockDb.enqueue([{ id: "ex-1", type: "no_meeting", date: "2026-11-01", notes: "Feriado" }]);
    expect(await listScheduleExceptions()).toEqual([
      { id: "ex-1", type: "no_meeting", date: "2026-11-01", notes: "Feriado" },
    ]);
    expect(vi.mocked(requirePrivilegedUser)).toHaveBeenCalledTimes(1);
    expect(
      mockDb.calls.some((call) => call.fn === "from" && call.args[0] === scheduleExceptions),
    ).toBe(true);
  });

  it("propaga o erro de autenticação privilegiada", async () => {
    vi.mocked(requirePrivilegedUser).mockRejectedValue(new Error("FORBIDDEN"));
    await expect(listScheduleExceptions()).rejects.toThrow("FORBIDDEN");
    expect(mockDb.calls).toHaveLength(0);
  });
});

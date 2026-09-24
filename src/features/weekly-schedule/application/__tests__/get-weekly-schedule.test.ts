import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMeetingSchedule } from "@/features/settings/application/queries";
import {
  buildPlaceholderSchedule,
  getWeeklySchedule,
} from "@/features/weekly-schedule/application/get-weekly-schedule";

vi.mock("@/features/settings/application/queries", () => ({
  getMeetingSchedule: vi.fn(),
}));

const reference = new Date(2026, 8, 23, 12);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getWeeklySchedule", () => {
  it("monta la semana de lunes a domingo con el horario configurado", async () => {
    vi.mocked(getMeetingSchedule).mockResolvedValue({
      congregationName: "Cong. Centro",
      midweekDay: 3,
      midweekTime: "20:00",
      weekendDay: 0,
      weekendTime: "09:30",
    });
    const schedule = await getWeeklySchedule(reference);
    expect(schedule.weekStart).toBe("2026-09-21");
    expect(schedule.weekEnd).toBe("2026-09-27");
    expect(new Date(`${schedule.weekStart}T00:00:00Z`).getUTCDay()).toBe(1);
    expect(new Date(`${schedule.weekEnd}T00:00:00Z`).getUTCDay()).toBe(0);
    expect(schedule.midweek).toEqual({
      id: "midweek-2026-09-21",
      kind: "midweek",
      date: "2026-09-23",
      time: "20:00",
      location: "Salón del Reino",
      theme: "Reunión entre semana",
      parts: [],
    });
    expect(schedule.weekend).toEqual({
      id: "weekend-2026-09-27",
      kind: "weekend",
      date: "2026-09-27",
      time: "09:30",
      location: "Salón del Reino",
      theme: "Reunión de fin de semana",
      parts: [],
    });
  });

  it("calcula las fechas desde los días configurados", async () => {
    vi.mocked(getMeetingSchedule).mockResolvedValue({
      congregationName: "",
      midweekDay: 2,
      midweekTime: "19:00",
      weekendDay: 6,
      weekendTime: "18:00",
    });
    const schedule = await getWeeklySchedule(reference);
    expect(schedule.midweek.date).toBe("2026-09-22");
    expect(schedule.midweek.time).toBe("19:00");
    expect(schedule.weekend.date).toBe("2026-09-26");
    expect(schedule.weekend.time).toBe("18:00");
  });

  it("devuelve el placeholder cuando el horario no se puede leer", async () => {
    vi.mocked(getMeetingSchedule).mockRejectedValue(new Error("neon unreachable"));
    const schedule = await getWeeklySchedule(reference);
    expect(schedule).toEqual(buildPlaceholderSchedule(reference));
    expect(schedule.weekStart).toBe("2026-09-21");
    expect(schedule.midweek.time).toBe("19:30");
    expect(schedule.weekend.time).toBe("10:00");
  });
});

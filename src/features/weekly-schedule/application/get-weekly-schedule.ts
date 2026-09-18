import { getMeetingSchedule } from "@/features/settings/application/queries";
import { getWeekRange, type WeeklySchedule } from "@/features/weekly-schedule/domain/schedule";

function addDaysToISODate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateForWeekday(mondayISO: string, weekday: number): string {
  return addDaysToISODate(mondayISO, (weekday - 1 + 7) % 7);
}

export function buildPlaceholderSchedule(reference: Date = new Date()): WeeklySchedule {
  const { weekStart, weekEnd } = getWeekRange(reference);

  return {
    weekStart,
    weekEnd,
    midweek: {
      id: `midweek-${weekStart}`,
      kind: "midweek",
      date: weekStart,
      time: "19:30",
      location: "Salón del Reino",
      theme: "Reunión entre semana",
      parts: [],
    },
    weekend: {
      id: `weekend-${weekEnd}`,
      kind: "weekend",
      date: weekEnd,
      time: "10:00",
      location: "Salón del Reino",
      theme: "Reunión de fin de semana",
      parts: [],
    },
  };
}

export async function getWeeklySchedule(reference: Date = new Date()): Promise<WeeklySchedule> {
  const { weekStart, weekEnd } = getWeekRange(reference);
  try {
    const settings = await getMeetingSchedule();
    return {
      weekStart,
      weekEnd,
      midweek: {
        id: `midweek-${weekStart}`,
        kind: "midweek",
        date: dateForWeekday(weekStart, settings.midweekDay),
        time: settings.midweekTime,
        location: "Salón del Reino",
        theme: "Reunión entre semana",
        parts: [],
      },
      weekend: {
        id: `weekend-${weekEnd}`,
        kind: "weekend",
        date: dateForWeekday(weekStart, settings.weekendDay),
        time: settings.weekendTime,
        location: "Salón del Reino",
        theme: "Reunión de fin de semana",
        parts: [],
      },
    };
  } catch {
    return buildPlaceholderSchedule(reference);
  }
}

import { getWeekRange, type WeeklySchedule } from "@/features/weekly-schedule/domain/schedule";

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
  return buildPlaceholderSchedule(reference);
}

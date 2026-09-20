export const MEETING_KINDS = ["midweek", "weekend"] as const;

export type MeetingKind = (typeof MEETING_KINDS)[number];

export interface MeetingPart {
  id: string;
  order: number;
  title: string;
  durationMinutes: number;
}

export interface Meeting {
  id: string;
  kind: MeetingKind;
  date: string;
  time: string;
  location: string;
  theme: string;
  parts: MeetingPart[];
}

export interface WeeklySchedule {
  weekStart: string;
  weekEnd: string;
  midweek: Meeting;
  weekend: Meeting;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getWeekRange(reference: Date = new Date()): { weekStart: string; weekEnd: string } {
  const current = new Date(reference);
  current.setHours(0, 0, 0, 0);
  const day = current.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(current);
  monday.setDate(current.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { weekStart: toISODate(monday), weekEnd: toISODate(sunday) };
}

/**
 * Escolhe qual reunião mostrar primeiro ao abrir a página: se hoje é anterior
 * ou igual ao dia da reunião entre semana, mostra ela; se já passou, mostra a
 * de fim de semana. Comparação lexicográfica vale porque é "AAAA-MM-DD".
 */
export function selectInitialKind(
  todayISODate: string,
  midweekISODate: string,
): "midweek" | "weekend" {
  return todayISODate <= midweekISODate ? "midweek" : "weekend";
}

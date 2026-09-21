export const WEEK_DAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
] as const;

export type WeekDay = (typeof WEEK_DAYS)[number]["value"];

export const SPECIAL_EVENT_TYPES = [
  { value: "regional_assembly", label: "Asamblea Regional" },
  { value: "circuit_assembly", label: "Asamblea con Viajante" },
  { value: "representative_assembly", label: "Asamblea con Representante" },
  { value: "memorial", label: "Celebración" },
  { value: "circuit_visit", label: "Visita del Superintendente de Circuito" },
  { value: "special_talk", label: "Discurso Especial" },
  { value: "other", label: "Otro" },
] as const;

export type SpecialEventType = (typeof SPECIAL_EVENT_TYPES)[number]["value"];

export const SCHEDULE_EXCEPTION_TYPES = [
  { value: "no_meeting", label: "Sin reunión" },
  { value: "modified_time", label: "Horario modificado" },
  { value: "special_meeting", label: "Reunión especial" },
] as const;

export type ScheduleExceptionType = (typeof SCHEDULE_EXCEPTION_TYPES)[number]["value"];

export interface MeetingSchedule {
  congregationName: string;
  midweekDay: WeekDay;
  midweekTime: string;
  weekendDay: WeekDay;
  weekendTime: string;
}

export const DEFAULT_MEETING_SCHEDULE: MeetingSchedule = {
  congregationName: "",
  midweekDay: 2,
  midweekTime: "19:30",
  weekendDay: 0,
  weekendTime: "10:00",
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

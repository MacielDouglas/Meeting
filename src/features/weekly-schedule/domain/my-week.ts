import type { MeetingKind } from "@/features/weekly-schedule/domain/schedule";

/** Parte da reunião em que o usuário é titular ou ajudante/leitor. */
export interface MyWeekPart {
  partKey: string;
  section: string;
  title: string;
  durationMinutes: number;
  songNumber: number | null;
  isHelper: boolean;
  personName: string;
  helperPersonName: string;
}

export interface MyWeekCleaning {
  assignmentDate: string;
  sectorName: string;
  isFamily: boolean;
}

export interface MyWeekDuty {
  assignmentDate: string;
  dutyKey: string;
  postLabel: string;
  side: string | null;
}

export interface MyWeekMeeting {
  kind: MeetingKind;
  title: string;
  date: string;
  time: string;
  location: string;
  isNext: boolean;
  parts: MyWeekPart[];
  cleaning: MyWeekCleaning[];
  duties: MyWeekDuty[];
}

export interface MyWeek {
  weekStart: string;
  weekEnd: string;
  personName: string | null;
  isMale: boolean;
  meetings: MyWeekMeeting[];
}

/** "AAAA-MM-DD" -> "DD/MM" para o cabeçalho da reunião. */
export function formatShortDay(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate;
  return `${match[3]}/${match[2]}`;
}

const WEEKDAY_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

/** "AAAA-MM-DD" -> dia da semana em espanhol ("jueves"); inválida volta intacta. */
export function formatWeekday(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate;
  // Meio-dia local: evita deriva de fuso na virada do dia.
  const dt = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return WEEKDAY_ES[dt.getDay()] ?? isoDate;
}

/** Dias inteiros de hoje (ISO) até a data; passado vale 0. */
export function daysUntil(isoDate: string, todayISO: string): number {
  const toDays = (iso: string): number | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
    if (!match) return null;
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000;
  };
  const target = toDays(isoDate);
  const today = toDays(todayISO);
  if (target == null || today == null) return 0;
  return Math.max(0, Math.round(target - today));
}

/** Etiqueta completa de urgência: "Hoy" | "Mañana" | "En N días". */
export function urgencyLabel(isoDate: string, todayISO: string): string {
  const days = daysUntil(isoDate, todayISO);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

/** Resumo da carga da pessoa: partes, limpeza e apoio En la reunión. */
export function assignmentSummary(partCount: number, cleaningCount: number, dutyCount = 0): string {
  const bits: string[] = [];
  if (partCount > 0) bits.push(partCount === 1 ? "1 parte" : `${partCount} partes`);
  if (cleaningCount > 0) bits.push("limpieza");
  if (dutyCount > 0) bits.push(dutyCount === 1 ? "1 en la reunión" : `${dutyCount} en la reunión`);
  if (bits.length === 0) return "Sin asignación";
  if (partCount === 0 && cleaningCount > 0 && dutyCount === 0) return "Limpieza";
  return bits.join(" · ");
}

/** Papel do segundo nome na linha de designação (leitor só nos estudos). */
export function helperRoleOf(partKey: string): "lector" | "ayudante" {
  return partKey === "congregation-study" || partKey === "watchtower-study" ? "lector" : "ayudante";
}

/** Título exibido da parte (cântico mostra número + "y oración" quando houver). */
export function displayPartTitle(part: Pick<MyWeekPart, "title" | "songNumber">): string {
  if (part.songNumber == null) return part.title;
  const suffix = /oraci[óo]n/i.test(part.title) ? " y oración" : "";
  return `Canción ${part.songNumber}${suffix}`;
}

export interface SectionGroup {
  section: string;
  parts: MyWeekPart[];
}

/** Agrupa as partes por seção preservando a ordem de aparição. */
export function groupPartsBySection(parts: MyWeekPart[]): SectionGroup[] {
  const groups: SectionGroup[] = [];
  const bySection = new Map<string, MyWeekPart[]>();
  for (const part of parts) {
    const list = bySection.get(part.section);
    if (list) {
      list.push(part);
    } else {
      bySection.set(part.section, [part]);
      groups.push({ section: part.section, parts: bySection.get(part.section) ?? [] });
    }
  }
  return groups;
}

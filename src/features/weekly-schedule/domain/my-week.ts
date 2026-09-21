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

export interface MyWeekMeeting {
  kind: MeetingKind;
  title: string;
  date: string;
  time: string;
  isNext: boolean;
  parts: MyWeekPart[];
  cleaning: MyWeekCleaning[];
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

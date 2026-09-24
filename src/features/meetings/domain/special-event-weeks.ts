import type { SpecialEventItem } from "@/features/settings/application/queries";

export const ASSEMBLY_EVENT_TYPES = [
  "regional_assembly",
  "circuit_assembly",
  "representative_assembly",
] as const;

export interface CircuitVisitDetails {
  speakerName: string;
  midweekTheme: string;
  publicTalkTheme: string;
  finalTalkTheme: string;
}

/** Nome genérico quando a visita foi cadastrada sem os detalhes. */
export const GENERIC_VISIT_SPEAKER = "Superintendente de Circuito";

export type WeekOverride =
  | { kind: "none" }
  | { kind: "assembly"; event: SpecialEventItem }
  | { kind: "celebration"; event: SpecialEventItem }
  | { kind: "special-talk"; event: SpecialEventItem }
  | { kind: "circuit-visit"; event: SpecialEventItem; visit: CircuitVisitDetails };

/** Variante visual do aviso (banner/avisos usam o mesmo vocabulário). */
export type SpecialEventVariant = Exclude<WeekOverride, { kind: "none" }>["kind"];

export interface DayNotice {
  variant: SpecialEventVariant;
  event: SpecialEventItem;
}

export interface WeekMeetings {
  /** Segunda-feira (AAAA-MM-DD). */
  weekStart: string;
  /** Domingo (AAAA-MM-DD). */
  weekEnd: string;
  midweekDate: string;
  weekendDate: string;
}

function eventEnd(event: SpecialEventItem): string {
  return event.endDate ?? event.startDate;
}

/** Intervalos ISO se sobrepõem (comparação lexicográfica vale para AAAA-MM-DD). */
function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA <= endB && endA >= startB;
}

function inRange(date: string, event: SpecialEventItem): boolean {
  return date >= event.startDate && date <= eventEnd(event);
}

function isAssembly(event: SpecialEventItem): boolean {
  return (ASSEMBLY_EVENT_TYPES as readonly string[]).includes(event.type);
}

export function toVisitDetails(event: SpecialEventItem): CircuitVisitDetails {
  return {
    speakerName: event.speakerName?.trim() ? event.speakerName : GENERIC_VISIT_SPEAKER,
    midweekTheme: event.midweekTheme ?? "",
    publicTalkTheme: event.publicTalkTheme ?? "",
    finalTalkTheme: event.finalTalkTheme ?? "",
  };
}

function daysBetween(a: string, b: string): number {
  const toDays = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d) / 86400000;
  };
  return Math.abs(toDays(a) - toDays(b));
}

/**
 * Resolve o que cada reunião da semana vira diante dos eventos especiais.
 * Prioridade por reunião: asamblea > celebración > visita > discurso especial.
 * - Asamblea com intervalo sobrepondo a semana cancela as duas reuniões.
 * - Celebración cancela a reunião cuja data cai no intervalo do evento
 *   (equivale a "seg–sex cancela meio de semana, sáb–dom cancela fim de semana").
 * - Visita ajusta o modelo (terça + discursos do superintendente), sem cancelar.
 * - Discurso Especial aparece na reunião mais próxima da data (empate: meio de semana).
 */
export function resolveWeekOverrides(
  week: WeekMeetings,
  events: SpecialEventItem[],
): { midweek: WeekOverride; weekend: WeekOverride } {
  const assembly = events.find(
    (event) =>
      isAssembly(event) && overlaps(week.weekStart, week.weekEnd, event.startDate, eventEnd(event)),
  );

  const celebrationFor = (meetingDate: string): SpecialEventItem | undefined =>
    events.find((event) => event.type === "memorial" && inRange(meetingDate, event));

  const visit = events.find(
    (event) =>
      event.type === "circuit_visit" &&
      overlaps(week.weekStart, week.weekEnd, event.startDate, eventEnd(event)),
  );

  const talks = events.filter(
    (event) =>
      event.type === "special_talk" &&
      event.startDate >= week.weekStart &&
      event.startDate <= week.weekEnd,
  );
  const nearestTalk = (meetingDate: string): SpecialEventItem | undefined => {
    let best: SpecialEventItem | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const talk of talks) {
      const distance = daysBetween(talk.startDate, meetingDate);
      if (distance < bestDistance) {
        best = talk;
        bestDistance = distance;
      }
    }
    return best;
  };

  const resolveFor = (kind: "midweek" | "weekend", meetingDate: string): WeekOverride => {
    if (assembly) return { kind: "assembly", event: assembly };
    const celebration = celebrationFor(meetingDate);
    if (celebration) return { kind: "celebration", event: celebration };
    if (visit) return { kind: "circuit-visit", event: visit, visit: toVisitDetails(visit) };
    const otherDate = kind === "midweek" ? week.weekendDate : week.midweekDate;
    const mine = nearestTalk(meetingDate);
    const other = nearestTalk(otherDate);
    // O mesmo discurso não aparece nas duas: fica com a reunião mais próxima
    // (empate vai para o meio de semana).
    if (mine && (!other || mine.id !== other.id)) return { kind: "special-talk", event: mine };
    if (mine && other && mine.id === other.id) {
      const myDistance = daysBetween(mine.startDate, meetingDate);
      const otherDistance = daysBetween(other.startDate, otherDate);
      if (myDistance < otherDistance || (myDistance === otherDistance && kind === "midweek")) {
        return { kind: "special-talk", event: mine };
      }
    }
    return { kind: "none" };
  };

  return {
    midweek: resolveFor("midweek", week.midweekDate),
    weekend: resolveFor("weekend", week.weekendDate),
  };
}

/** Asamblea e Celebración substituem a reunião (bloqueiam programar/salvar). */
export function blocksMeeting(
  override: WeekOverride,
): override is Extract<WeekOverride, { kind: "assembly" | "celebration" }> {
  return override.kind === "assembly" || override.kind === "celebration";
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Segunda-feira (AAAA-MM-DD) da semana que contém a data. */
export function mondayOfISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
  return dt.toISOString().slice(0, 10);
}

/**
 * Aviso de uma data avulsa (cards de designações): asamblea da semana,
 * celebración na data, visita da semana ou discurso especial na data.
 */
export function noticeForDate(
  date: string,
  weekStart: string,
  events: SpecialEventItem[],
): DayNotice | null {
  const weekEnd = addDaysISO(weekStart, 6);
  const assembly = events.find(
    (event) => isAssembly(event) && overlaps(weekStart, weekEnd, event.startDate, eventEnd(event)),
  );
  if (assembly) return { variant: "assembly", event: assembly };
  const celebration = events.find((event) => event.type === "memorial" && inRange(date, event));
  if (celebration) return { variant: "celebration", event: celebration };
  const visit = events.find(
    (event) =>
      event.type === "circuit_visit" &&
      overlaps(weekStart, weekEnd, event.startDate, eventEnd(event)),
  );
  if (visit) return { variant: "circuit-visit", event: visit };
  const talk = events.find((event) => event.type === "special_talk" && event.startDate === date);
  if (talk) return { variant: "special-talk", event: talk };
  return null;
}

const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function splitISO(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

/**
 * "2026-09-12" → "12 de septiembre de 2026";
 * "2026-09-12"–"2026-09-14" → "12 al 14 de septiembre de 2026";
 * entre meses → "28 de septiembre al 2 de octubre de 2026".
 */
export function formatEventRange(startDate: string, endDate: string | null): string {
  const start = splitISO(startDate);
  if (!endDate || endDate === startDate) {
    return `${start.day} de ${MONTHS_ES[start.month - 1]} de ${start.year}`;
  }
  const end = splitISO(endDate);
  if (start.year === end.year && start.month === end.month) {
    return `${start.day} al ${end.day} de ${MONTHS_ES[start.month - 1]} de ${start.year}`;
  }
  if (start.year === end.year) {
    return `${start.day} de ${MONTHS_ES[start.month - 1]} al ${end.day} de ${MONTHS_ES[end.month - 1]} de ${start.year}`;
  }
  return `${start.day} de ${MONTHS_ES[start.month - 1]} de ${start.year} al ${end.day} de ${MONTHS_ES[end.month - 1]} de ${end.year}`;
}

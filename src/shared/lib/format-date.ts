const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Converte "AAAA-MM-DD" em "DD-MM-AAAA" para exibição.
 * Se o valor não for uma data ISO válida, devolve o original.
 */
export function formatDateBR(isoDate: string): string {
  const match = ISO_DATE_PATTERN.exec(isoDate.trim());
  if (!match) return isoDate;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/** Data local de hoje em "AAAA-MM-DD" (sem desvio de fuso do toISOString). */
export function todayLocalISO(reference: Date = new Date()): string {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  const day = String(reference.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Nomes de dias e meses em espanhol (fonte única para calendário e intervalos). */
export const WEEKDAY_FULL_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

export const WEEKDAY_SHORT_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;

export const MONTH_SHORT_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

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

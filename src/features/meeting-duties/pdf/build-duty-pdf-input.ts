import type { DutyPdfDay, DutyPdfHeadCell, DutyPdfInput, DutyPdfSlot } from "./duty-pdf-types";

/** Ordem canônica das colunas (acomodadores, microfones, som, vídeo, plataforma). */
const DUTY_ORDER = ["usher", "microphone", "sound", "video", "platform"];

/** Rótulos em espanhol quando o posto não tem nome na config. */
const DUTY_FALLBACK_ES: Record<string, string> = {
  usher: "Acomodadores",
  microphone: "Micrófono",
  sound: "Sonido",
  video: "Video",
  platform: "Plataforma",
};

const WEEKDAYS_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

function formatDateLabel(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  const dt = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return `${match[3]}/${match[2]} · ${WEEKDAYS_ES[dt.getDay()] ?? ""}`.trim();
}

function formatShort(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  return `${match[3]}/${match[2]}`;
}

function formatYear(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  return match?.[1] ?? "";
}

export interface BuildDutyPdfOpts {
  organizationName: string;
  title: string;
  colDate: string;
  emptyCell: string;
  internoLabel: string;
  externoLabel: string;
  filePrefix: string;
}

interface DutyPdfColumn {
  key: string;
  dutyKey: string;
  side: "interno" | "externo" | null;
  header: string;
}

function dutyFallbackName(dutyKey: string): string {
  return DUTY_FALLBACK_ES[dutyKey] ?? dutyKey;
}

function collectColumns(days: DutyPdfDay[]): DutyPdfColumn[] {
  const seen = new Map<string, DutyPdfColumn>();
  for (const day of days) {
    for (const slot of day.slots) {
      if (slot.dutyKey === "usher" && slot.side) {
        const side = slot.side === "interno" ? "interno" : "externo";
        const key = `usher|${side}`;
        if (!seen.has(key)) {
          seen.set(key, {
            key,
            dutyKey: "usher",
            side,
            header: slot.dutyName || dutyFallbackName("usher"),
          });
        }
        continue;
      }
      const key = `${slot.dutyKey}|`;
      if (!seen.has(key)) {
        seen.set(key, {
          key,
          dutyKey: slot.dutyKey,
          side: null,
          header: slot.dutyName || dutyFallbackName(slot.dutyKey),
        });
      }
    }
  }
  const rank = (dutyKey: string): number => {
    const index = DUTY_ORDER.indexOf(dutyKey);
    return index === -1 ? DUTY_ORDER.length : index;
  };
  return [...seen.values()].sort((a, b) => {
    if (rank(a.dutyKey) !== rank(b.dutyKey)) return rank(a.dutyKey) - rank(b.dutyKey);
    if (a.side === "externo" && b.side === "interno") return -1;
    if (a.side === "interno" && b.side === "externo") return 1;
    return a.header.localeCompare(b.header, "es");
  });
}

function slotColumnKey(slot: DutyPdfSlot): string {
  if (slot.dutyKey === "usher" && slot.side) {
    return `usher|${slot.side === "interno" ? "interno" : "externo"}`;
  }
  return `${slot.dutyKey}|`;
}

export function buildDutyPdfInput(
  days: DutyPdfDay[],
  periodFrom: string,
  periodTo: string,
  opts: BuildDutyPdfOpts,
): DutyPdfInput {
  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const columns = collectColumns(sortedDays);
  const columnIndex = new Map(columns.map((column, index) => [column.key, index]));
  const hasUsherSplit = columns.some((column) => column.dutyKey === "usher" && column.side);

  const usherHeader =
    columns.find((column) => column.dutyKey === "usher")?.header ?? dutyFallbackName("usher");
  const otherColumns = columns.filter((column) => column.dutyKey !== "usher");
  const head: DutyPdfHeadCell[][] = hasUsherSplit
    ? [
        [
          { content: opts.colDate, rowSpan: 2 },
          { content: usherHeader, colSpan: 2 },
          ...otherColumns.map((column) => ({ content: column.header, rowSpan: 2 })),
        ],
        [{ content: opts.externoLabel }, { content: opts.internoLabel }],
      ]
    : [[opts.colDate, ...columns.map((column) => column.header)]];

  const rows = sortedDays.map((day) => {
    const names: string[][] = columns.map(() => []);
    for (const slot of day.slots) {
      const index = columnIndex.get(slotColumnKey(slot));
      if (index !== undefined) names[index]?.push(slot.personName || opts.emptyCell);
    }
    return {
      date: formatDateLabel(day.date),
      cells: names.map((cell) => cell.join(" - ") || opts.emptyCell),
    };
  });

  return {
    organizationName: opts.organizationName.trim() || opts.title,
    title: opts.title,
    periodLine: `${formatShort(periodFrom)} — ${formatShort(periodTo)} de ${formatYear(periodTo)}`,
    head,
    rows,
    fileName: `${opts.filePrefix}-${periodFrom}_${periodTo}.pdf`,
  };
}

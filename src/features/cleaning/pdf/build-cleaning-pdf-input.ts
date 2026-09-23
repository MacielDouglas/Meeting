import type { CleaningPdfDay, CleaningPdfInput, CleaningPdfSector } from "./cleaning-pdf-types";

export interface CleaningPdfAssignment {
  assignmentDate: string;
  sectorKey: string;
  sectorName: string;
  personName: string;
  sortOrder: number;
}

export interface BuildCleaningPdfOpts {
  organizationName: string;
  title: string;
  colDate: string;
  periodFrom: string;
  periodTo: string;
  emptyCell: string;
  tasksHeading: string;
  noDescription: string;
  titleDefault: string;
  filePrefix: string;
  /** Tarefas por sectorKey (da config de limpeza). */
  sectorTasks: Record<string, string>;
}

const WEEKDAYS_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

function formatShort(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  return `${match[3]}/${match[2]}`;
}

export function buildCleaningPdfInput(
  assignments: CleaningPdfAssignment[],
  opts: BuildCleaningPdfOpts,
): CleaningPdfInput {
  const sectorMap = new Map<string, { name: string; firstOrder: number }>();
  for (const assignment of assignments) {
    const current = sectorMap.get(assignment.sectorKey);
    if (!current) {
      sectorMap.set(assignment.sectorKey, {
        name: assignment.sectorName,
        firstOrder: assignment.sortOrder,
      });
    }
  }
  const sectors: CleaningPdfSector[] = [...sectorMap.entries()]
    .sort((a, b) => a[1].firstOrder - b[1].firstOrder || a[1].name.localeCompare(b[1].name, "es"))
    .map(([id, sector]) => ({
      id,
      name: sector.name,
      task: opts.sectorTasks[id]?.trim() ? opts.sectorTasks[id] : null,
    }));

  const byDate = new Map<string, CleaningPdfDay>();
  const sorted = [...assignments].sort(
    (a, b) => a.assignmentDate.localeCompare(b.assignmentDate) || a.sortOrder - b.sortOrder,
  );
  for (const assignment of sorted) {
    const day = byDate.get(assignment.assignmentDate) ?? {
      date: assignment.assignmentDate,
      bySector: {},
    };
    const list = day.bySector[assignment.sectorKey] ?? [];
    list.push(assignment.personName || opts.emptyCell);
    day.bySector[assignment.sectorKey] = list;
    byDate.set(assignment.assignmentDate, day);
  }

  return {
    organizationName: opts.organizationName.trim() || opts.titleDefault,
    title: opts.title,
    sectors,
    days: [...byDate.values()],
    fileName: `${opts.filePrefix}-${opts.periodFrom}_${opts.periodTo}.pdf`,
    i18n: {
      colDate: opts.colDate,
      periodLine: `${formatShort(opts.periodFrom)} — ${formatShort(opts.periodTo)}`,
      tasksHeading: opts.tasksHeading,
      noDescription: opts.noDescription,
      emptyCell: opts.emptyCell,
      titleDefault: opts.titleDefault,
      weekdays: [...WEEKDAYS_ES],
    },
  };
}

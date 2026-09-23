export interface CleaningPdfSector {
  id: string;
  name: string;
  task: string | null;
}

export interface CleaningPdfDay {
  date: string;
  /** Nomes por id do setor. */
  bySector: Record<string, string[]>;
}

export interface CleaningPdfI18n {
  colDate: string;
  periodLine: string;
  tasksHeading: string;
  noDescription: string;
  emptyCell: string;
  titleDefault: string;
  weekdays: string[];
}

export interface CleaningPdfInput {
  organizationName: string;
  title: string;
  sectors: CleaningPdfSector[];
  days: CleaningPdfDay[];
  fileName: string;
  i18n: CleaningPdfI18n;
}

export type DutyPdfHeadCell =
  | string
  | {
      content: string;
      colSpan?: number;
      rowSpan?: number;
    };

export interface DutyPdfSlot {
  dutyKey: string;
  dutyName: string;
  side: string | null;
  personName: string;
}

export interface DutyPdfDay {
  date: string;
  slots: DutyPdfSlot[];
}

export interface DutyPdfInput {
  organizationName: string;
  title: string;
  periodLine: string;
  /** Cabeçalho em até 2 linhas (acomodador divide Interno/Externo). */
  head: DutyPdfHeadCell[][];
  rows: { date: string; cells: string[] }[];
  fileName: string;
}

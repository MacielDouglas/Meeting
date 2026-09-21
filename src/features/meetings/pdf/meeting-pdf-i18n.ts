import type { MeetingPdfAssigneeRole, MeetingPdfSectionKey } from "./meeting-pdf-types";

export type MeetingPdfLabels = {
  documentTitle: string;
  weekendDocumentTitle: string;
  bibleTreasures: string;
  applyYourself: string;
  christianLife: string;
  publicTalk: string;
  watchtowerStudy: string;
  song: string;
  prayer: string;
  openingComments: string;
  concludingComments: string;
  congregationBibleStudy: string;
  conductor: string;
  reader: string;
  chairman: string;
  assistant: string;
};

export const MEETING_PDF_LABELS_ES: MeetingPdfLabels = {
  documentTitle: "REUNIÓN DE ENTRE SEMANA",
  weekendDocumentTitle: "REUNIÓN DE FIN DE SEMANA",
  bibleTreasures: "TESOROS DE LA BIBLIA",
  applyYourself: "SEAMOS MEJORES MAESTROS",
  christianLife: "NUESTRA VIDA CRISTIANA",
  publicTalk: "DISCURSO PÚBLICO",
  watchtowerStudy: "ESTUDIO DE LA ATALAYA",
  song: "Canción",
  prayer: "Oración",
  openingComments: "Palabras de introducción",
  concludingComments: "Palabras de conclusión",
  congregationBibleStudy: "Estudio bíblico de la congregación",
  conductor: "Conductor",
  reader: "Lector",
  chairman: "Presidente",
  assistant: "Ayudante",
};

export const MEETING_PDF_FILE_PREFIXES = {
  single: "reunion-entre-semana",
  plural: "reuniones-entre-semana",
  weekendSingle: "reunion-fin-de-semana",
  weekendPlural: "reuniones-fin-de-semana",
} as const;

/** "2026-09-10" -> "10/9/26". */
export function formatMeetingDate(dateString: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateString);
  if (!match) return dateString;
  const [, yearString, monthString, dayString] = match;
  return `${Number(dayString)}/${Number(monthString)}/${String(Number(yearString)).slice(-2)}`;
}

export function getSectionLabel(labels: MeetingPdfLabels, section: MeetingPdfSectionKey): string {
  switch (section) {
    case "bibleTreasures":
      return labels.bibleTreasures;
    case "applyYourself":
      return labels.applyYourself;
    case "christianLife":
      return labels.christianLife;
    case "publicTalk":
      return labels.publicTalk;
    case "watchtowerStudy":
      return labels.watchtowerStudy;
  }
}

export function getRoleLabel(
  labels: MeetingPdfLabels,
  role: MeetingPdfAssigneeRole | undefined,
): string | undefined {
  switch (role) {
    case "chairman":
      return labels.chairman;
    case "conductor":
      return labels.conductor;
    case "reader":
      return labels.reader;
    case "assistant":
      return labels.assistant;
    case "prayer":
      return labels.prayer;
    default:
      return undefined;
  }
}

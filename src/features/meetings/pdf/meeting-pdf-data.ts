import type { MeetingAssignmentItem, PdfProgramItem } from "../application/meeting-queries";
import { MEETING_PDF_LABELS_ES } from "./meeting-pdf-i18n";
import type {
  MeetingPdfAssignee,
  MeetingPdfAssigneeRole,
  MeetingPdfData,
  MeetingPdfItem,
  MeetingPdfSection,
  MeetingPdfSectionKey,
} from "./meeting-pdf-types";

/** Partes sem número no impresso (cânticos e palavras de introdução/conclusão). */
const UNNUMBERED_KEYS = new Set([
  "opening-song",
  "middle-song",
  "closing-song",
  "watchtower-song",
  "opening-comments",
  "concluding-comments",
]);

const SECTION_ORDER: MeetingPdfSectionKey[] = [
  "bibleTreasures",
  "applyYourself",
  "christianLife",
  "publicTalk",
  "watchtowerStudy",
];

function sectionKeyOf(section: string): MeetingPdfSectionKey | null {
  switch (section) {
    case "TESOROS DE LA BIBLIA":
      return "bibleTreasures";
    case "SEAMOS MEJORES MAESTROS":
      return "applyYourself";
    case "NUESTRA VIDA CRISTIANA":
      return "christianLife";
    case "PUBLIC TALK":
      return "publicTalk";
    case "ESTUDIO DE LA ATALAYA":
      return "watchtowerStudy";
    default:
      return null;
  }
}

export function cleanText(value: string | null | undefined): string | undefined {
  const text = value?.replace(/\s+/g, " ").trim();
  return text || undefined;
}

function holderRole(partKey: string, hasPerson: boolean): MeetingPdfAssigneeRole | undefined {
  if (!hasPerson) return undefined;
  if (partKey === "president") return "chairman";
  if (partKey === "closing-song") return "prayer";
  if (partKey === "congregation-study" || partKey === "watchtower-study") return "conductor";
  return undefined;
}

function helperRole(partKey: string, hasHelper: boolean): MeetingPdfAssigneeRole | undefined {
  if (!hasHelper) return undefined;
  if (partKey === "congregation-study" || partKey === "watchtower-study") return "reader";
  return "assistant";
}

function songTitle(a: MeetingAssignmentItem): string {
  if (a.songNumber) {
    const theme = cleanText(a.songTheme);
    return theme
      ? `${MEETING_PDF_LABELS_ES.song} ${a.songNumber} — ${theme}`
      : `${MEETING_PDF_LABELS_ES.song} ${a.songNumber}`;
  }
  return cleanText(a.title) ?? MEETING_PDF_LABELS_ES.song;
}

function baseTitle(a: MeetingAssignmentItem): string {
  if (a.songNumber || a.partKey.includes("song")) return songTitle(a);
  return cleanText(a.title) ?? "";
}

export function withDurationSuffix(title: string, durationMin: number): string {
  const text = cleanText(title.replace(/\s*\(\d+\s*min\)\s*$/i, "")) ?? "";
  if (!text) return "";
  if (!durationMin || durationMin <= 0) return text;
  return `${text} (${durationMin}min)`;
}

function toItem(
  a: MeetingAssignmentItem,
  number: number | null,
  emphasis: MeetingPdfItem["emphasis"] = "normal",
): MeetingPdfItem {
  const title = number !== null ? `${number}. ${baseTitle(a)}` : baseTitle(a);
  const assignees: MeetingPdfAssignee[] = [];
  if (a.personName.trim() !== "") {
    assignees.push({ name: a.personName.trim(), role: holderRole(a.partKey, true) });
  }
  if (a.helperPersonName.trim() !== "") {
    assignees.push({ name: a.helperPersonName.trim(), role: helperRole(a.partKey, true) });
  }
  return {
    id: a.id,
    time: a.startTime,
    title: withDurationSuffix(title, a.durationMinutes),
    subtitle: undefined,
    assignees,
    emphasis,
    durationMin: a.durationMinutes,
  };
}

function talkItem(a: MeetingAssignmentItem, number: number | null): MeetingPdfItem {
  const item = toItem(a, number);
  if (a.partKey === "public-talk" && a.speakerCongregation.trim() !== "" && item.assignees?.[0]) {
    item.assignees[0] = {
      ...item.assignees[0],
      name: `${item.assignees[0].name} — ${a.speakerCongregation.trim()}`,
    };
  }
  return item;
}

export function mapProgramToPdfData(
  program: PdfProgramItem,
  congregationName: string,
): MeetingPdfData | null {
  const byKey = new Map<string, MeetingAssignmentItem[]>();
  for (const a of [...program.assignments].sort((x, y) => x.sortOrder - y.sortOrder)) {
    const list = byKey.get(a.partKey) ?? [];
    list.push(a);
    byKey.set(a.partKey, list);
  }
  const first = (key: string) => byKey.get(key)?.[0];

  const president = first("president");
  const openingSong = first("opening-song");
  const introduction = first("opening-comments");
  const conclusion = first("concluding-comments");
  const closingSong = first("closing-song");

  const openingItem = openingSong
    ? {
        ...toItem(openingSong, null, "song"),
        assignees:
          president && president.personName.trim() !== ""
            ? [{ name: president.personName.trim(), role: "chairman" as const }]
            : [],
      }
    : undefined;

  const introductionItem = introduction ? toItem(introduction, null, "opening") : undefined;

  let number = 0;
  const sections: MeetingPdfSection[] = [];
  const pendingLead: MeetingPdfItem[] = [];
  const ordered = [...program.assignments].sort((x, y) => x.sortOrder - y.sortOrder);
  const sectionBuckets = new Map<MeetingPdfSectionKey, MeetingAssignmentItem[]>();
  for (const a of ordered) {
    if (
      a.partKey === "president" ||
      a.partKey === "opening-song" ||
      a.partKey === "opening-comments" ||
      a.partKey === "concluding-comments" ||
      a.partKey === "closing-song"
    ) {
      continue;
    }
    const key = sectionKeyOf(a.section);
    if (!key) {
      pendingLead.push(toItem(a, null, a.songNumber ? "song" : "normal"));
      continue;
    }
    const bucket = sectionBuckets.get(key) ?? [];
    bucket.push(a);
    sectionBuckets.set(key, bucket);
  }

  for (const key of SECTION_ORDER) {
    const bucket = sectionBuckets.get(key) ?? [];
    if (bucket.length === 0) continue;
    const items = bucket.map((a) => {
      const numbered = !UNNUMBERED_KEYS.has(a.partKey);
      if (numbered) number += 1;
      const item =
        a.partKey === "public-talk"
          ? talkItem(a, numbered ? number : null)
          : toItem(a, numbered ? number : null);
      if (a.partKey === "congregation-study" || a.partKey === "watchtower-study") {
        item.emphasis = "study";
      }
      return item;
    });
    sections.push({ key, items });
  }

  const conclusionItem = conclusion ? toItem(conclusion, null, "conclusion") : undefined;
  const closingItem = closingSong ? toItem(closingSong, null, "song") : undefined;

  return {
    id: program.id,
    date: program.date,
    congregationName: congregationName.trim(),
    openingItem,
    introduction: introductionItem,
    leadItems: pendingLead,
    sections,
    conclusion: conclusionItem,
    closingItem,
    startTime: undefined,
  };
}

export function mapProgramsToPdfData(
  programs: PdfProgramItem[],
  congregationName: string,
): MeetingPdfData[] {
  return programs
    .map((program) => mapProgramToPdfData(program, congregationName))
    .filter((meeting): meeting is MeetingPdfData => meeting !== null);
}

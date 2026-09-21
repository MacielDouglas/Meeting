import type { jsPDF } from "jspdf";
import { getRoleLabel, getSectionLabel, type MeetingPdfLabels } from "./meeting-pdf-i18n";
import { drawSectionIcon, type SectionIconKey } from "./meeting-pdf-icons";
import {
  getColumnMetrics,
  PDF_LAYOUT,
  type PdfLayout,
  planPages,
  scalePdfLayout,
  splitPdfText,
} from "./meeting-pdf-layout";
import type {
  MeetingPdfAssignee,
  MeetingPdfData,
  MeetingPdfItem,
  MeetingPdfSectionKey,
} from "./meeting-pdf-types";

type Pdf = jsPDF;

const CONTROL_CHARACTERS = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(
    8,
  )}${String.fromCharCode(11)}${String.fromCharCode(
    12,
  )}${String.fromCharCode(14)}-${String.fromCharCode(31)}]`,
  "g",
);

const DATE_BAND_COLOR: [number, number, number] = [104, 119, 119];

const SECTION_STYLES: Record<
  MeetingPdfSectionKey,
  {
    strong: [number, number, number];
    light: [number, number, number];
  }
> = {
  bibleTreasures: {
    strong: [60, 127, 139],
    light: [231, 241, 243],
  },
  applyYourself: {
    strong: [214, 143, 0],
    light: [253, 243, 230],
  },
  christianLife: {
    strong: [191, 47, 19],
    light: [249, 234, 230],
  },
  publicTalk: {
    strong: [47, 72, 104],
    light: [234, 238, 242],
  },
  watchtowerStudy: {
    strong: [77, 101, 77],
    light: [236, 239, 236],
  },
};

export function safeText(value: string | undefined | null): string {
  return value?.replace(CONTROL_CHARACTERS, "").replace(/\s+/g, " ").trim() ?? "";
}

function setTextColor(pdf: Pdf, color: [number, number, number]) {
  pdf.setTextColor(color[0], color[1], color[2]);
}

function setFillColor(pdf: Pdf, color: [number, number, number]) {
  pdf.setFillColor(color[0], color[1], color[2]);
}

function getAssigneeDisplayText(assignee: MeetingPdfAssignee, labels: MeetingPdfLabels): string {
  const name = safeText(assignee.name);

  if (!name) {
    return "";
  }

  const role = getRoleLabel(labels, assignee.role);

  if (!role) {
    return name;
  }

  return `${name} (${role})`;
}

function drawAssignees(
  pdf: Pdf,
  assignees: MeetingPdfAssignee[] | undefined,
  labels: MeetingPdfLabels,
  rightX: number,
  topY: number,
  width: number,
  layout: PdfLayout = PDF_LAYOUT,
): void {
  if (!assignees?.length) {
    return;
  }

  let cursorY = topY + layout.rowPaddingTop + layout.assigneeLineHeight * 0.74;

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(layout.assigneeTextSize);
  pdf.setTextColor(0, 0, 0);

  for (const assignee of assignees) {
    const displayText = getAssigneeDisplayText(assignee, labels);

    if (!displayText) {
      continue;
    }

    const lines = splitPdfText(pdf, displayText, width);

    for (const line of lines) {
      pdf.text(line, rightX, cursorY, { align: "right" });
      cursorY += layout.assigneeLineHeight;
    }
  }
}

function drawTime(
  pdf: Pdf,
  time: string | undefined,
  x: number,
  topY: number,
  width: number,
  layout: PdfLayout = PDF_LAYOUT,
): void {
  const value = safeText(time);

  if (!value) {
    return;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(layout.timeTextSize);
  pdf.setTextColor(0, 0, 0);
  pdf.text(value, x + width / 2, topY + layout.rowPaddingTop + layout.timeTextSize * 0.387, {
    align: "center",
  });
}

function measureRowParts(
  pdf: Pdf,
  item: MeetingPdfItem,
  labels: MeetingPdfLabels,
  columns: {
    timeColumnWidth: number;
    assigneeColumnWidth: number;
    activityLeftPadding: number;
    activityWidth: number;
  },
  isLast = false,
  layout: PdfLayout = PDF_LAYOUT,
): { titleLines: string[]; subtitleLines: string[]; rowHeight: number } {
  const isSong = item.emphasis === "song";

  pdf.setFont("helvetica", isSong ? "italic" : "bold");
  pdf.setFontSize(layout.bodyTextSize);
  const titleLines = splitPdfText(pdf, item.title, columns.activityWidth);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(layout.bodyTextSmallSize);
  const subtitleLines = splitPdfText(pdf, item.subtitle, columns.activityWidth);

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(layout.assigneeTextSize);
  const assigneeWidth = columns.assigneeColumnWidth - layout.activityLeftPadding;
  const assigneeLineCount = (item.assignees ?? []).reduce((count, assignee) => {
    const text = getAssigneeDisplayText(assignee, labels);
    return count + Math.max(splitPdfText(pdf, text, assigneeWidth).length, 1);
  }, 0);

  const lineCount = Math.max(titleLines.length, 1);
  const subtitleHeight = subtitleLines.length * layout.subtitleLineHeight;
  const titleHeight = lineCount * layout.lineHeight + subtitleHeight;
  const assigneeHeight = assigneeLineCount > 0 ? assigneeLineCount * layout.assigneeLineHeight : 0;

  const contentFloor = item.compactAfter || isLast ? 0 : isSong ? layout.songRowMinHeight : 0;
  const contentHeight = Math.max(titleHeight, assigneeHeight, contentFloor);

  const paddingBottom = isLast
    ? 0
    : item.compactAfter
      ? layout.rowPaddingBottom * 0.2
      : isSong
        ? layout.rowPaddingBottom * 0.7
        : layout.rowPaddingBottom;

  const minHeight = isLast
    ? 0
    : item.compactAfter
      ? layout.compactRowMinHeight
      : isSong
        ? layout.songRowMinHeight
        : layout.itemMinHeight;

  const rowHeight = Math.max(contentHeight + layout.rowPaddingTop + paddingBottom, minHeight);

  return { titleLines, subtitleLines, rowHeight };
}

export function measureRowHeight(
  pdf: Pdf,
  item: MeetingPdfItem,
  labels: MeetingPdfLabels,
  contentWidth: number,
  isLast = false,
  layout: PdfLayout = PDF_LAYOUT,
): number {
  const columns = getColumnMetrics(contentWidth);

  return measureRowParts(pdf, item, labels, columns, isLast, layout).rowHeight;
}

export function drawProgramRow(
  pdf: Pdf,
  item: MeetingPdfItem,
  labels: MeetingPdfLabels,
  x: number,
  y: number,
  contentWidth: number,
  isLast = false,
  layout: PdfLayout = PDF_LAYOUT,
): number {
  const columns = getColumnMetrics(contentWidth);
  const activityX = x + columns.timeColumnWidth + layout.activityLeftPadding;
  const contentRight = x + contentWidth;
  const assigneeRight = contentRight - layout.activityLeftPadding;

  const measured = measureRowParts(pdf, item, labels, columns, isLast, layout);
  const { titleLines, subtitleLines } = measured;

  const rowHeight = measured.rowHeight;

  if (item.time) {
    pdf.setFillColor(244, 246, 246);
    pdf.rect(x, y, columns.timeColumnWidth, rowHeight, "F");
  }

  drawTime(pdf, item.time, x, y, columns.timeColumnWidth, layout);

  const isSong = item.emphasis === "song";
  const isConclusion = item.emphasis === "conclusion";

  pdf.setFont("helvetica", isSong ? "italic" : isConclusion ? "bold" : "bold");
  pdf.setFontSize(layout.bodyTextSize);
  pdf.setTextColor(0, 0, 0);

  let textY = y + layout.rowPaddingTop + layout.bodyTextSize * 0.337;

  for (const line of titleLines.length > 0 ? titleLines : [""]) {
    pdf.text(line, activityX, textY);
    textY += layout.lineHeight;
  }

  if (subtitleLines.length > 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(layout.bodyTextSmallSize);
    pdf.setTextColor(85, 85, 85);

    for (const line of subtitleLines) {
      pdf.text(line, activityX, textY);
      textY += layout.subtitleLineHeight;
    }
  }

  drawAssignees(
    pdf,
    item.assignees,
    labels,
    assigneeRight,
    y,
    columns.assigneeColumnWidth - layout.activityLeftPadding,
    layout,
  );

  return y + rowHeight;
}

export type TitledBandInput = {
  title: string;
  icon: SectionIconKey;
  strong: [number, number, number];
  light: [number, number, number];
};

export function drawTitledBand(
  pdf: Pdf,
  input: TitledBandInput,
  x: number,
  y: number,
  width: number,
  layout: PdfLayout = PDF_LAYOUT,
): number {
  const iconWidth = layout.sectionIconWidth;
  const height = layout.sectionBandHeight;

  setFillColor(pdf, input.strong);
  pdf.rect(x, y, iconWidth, height, "F");

  setFillColor(pdf, input.light);
  pdf.rect(x + iconWidth, y, width - iconWidth, height, "F");

  drawSectionIcon(pdf, input.icon, x + iconWidth / 2, y + height / 2, iconWidth * 0.52);

  const textX = x + iconWidth + 2.3;
  const textY = y + height / 2 + layout.sectionTitleSize * 0.153;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(layout.sectionTitleSize);
  setTextColor(pdf, input.strong);
  pdf.text(input.title, textX, textY);

  return y + height + layout.sectionGapAfter;
}

export function drawSectionWithBackground(
  pdf: Pdf,
  input: TitledBandInput,
  items: MeetingPdfItem[],
  labels: MeetingPdfLabels,
  x: number,
  y: number,
  width: number,
  lastRowIndex: number | null = null,
  layout: PdfLayout = PDF_LAYOUT,
): number {
  let backgroundHeight = layout.sectionBandHeight;

  items.forEach((item, index) => {
    backgroundHeight += measureRowHeight(pdf, item, labels, width, lastRowIndex === index, layout);
  });

  setFillColor(pdf, input.light);
  pdf.rect(x, y, width, backgroundHeight, "F");

  let cursorY = drawTitledBand(pdf, input, x, y, width, layout);

  items.forEach((item, index) => {
    cursorY = drawProgramRow(pdf, item, labels, x, cursorY, width, lastRowIndex === index, layout);
  });

  return cursorY;
}

export function drawDateBand(
  pdf: Pdf,
  dateText: string,
  x: number,
  y: number,
  width: number,
  layout: PdfLayout = PDF_LAYOUT,
): number {
  const height = layout.dateBandHeight;
  const text = safeText(dateText);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(layout.dateBandTextSize);
  setTextColor(pdf, DATE_BAND_COLOR);
  pdf.text(text, x, y + height - layout.dateBandTextSize * 0.122);

  const textWidth = pdf.getTextWidth(text);

  pdf.setDrawColor(DATE_BAND_COLOR[0], DATE_BAND_COLOR[1], DATE_BAND_COLOR[2]);
  pdf.setLineWidth(0.3);
  pdf.line(x + textWidth + 3, y + height / 2, x + width, y + height / 2);

  return y + height + layout.dateBandGapAfter;
}

export function drawPageHeader(
  pdf: Pdf,
  meeting: { congregationName: string },
  documentTitle: string,
  x: number,
  y: number,
  width: number,
): number {
  const centerX = x + width / 2;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(PDF_LAYOUT.congregationSize);
  pdf.setTextColor(0, 0, 0);
  pdf.text(safeText(meeting.congregationName), centerX, y + 5.5, {
    align: "center",
  });

  pdf.setDrawColor(190, 190, 190);
  pdf.setLineWidth(0.2);
  pdf.line(x + 25, y + 7, x + width - 25, y + 7);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(PDF_LAYOUT.headerTitleSize);
  pdf.setTextColor(0, 0, 0);
  pdf.text(documentTitle, centerX, y + 10.8, {
    align: "center",
  });

  return y + PDF_LAYOUT.pageHeaderHeight;
}

function drawMeetingBlock(
  pdf: Pdf,
  meeting: MeetingPdfData,
  labels: MeetingPdfLabels,
  x: number,
  y: number,
  width: number,
  layout: PdfLayout = PDF_LAYOUT,
): number {
  const hasClosing = !!meeting.closingItem;
  const hasConclusion = !!meeting.conclusion;
  const lastSectionIndex = meeting.sections.length - 1;

  let cursorY = drawDateBand(pdf, meeting.date, x, y, width, layout);

  const standaloneLast = !hasClosing && !hasConclusion && meeting.sections.length === 0;

  if (meeting.openingItem) {
    cursorY = drawProgramRow(
      pdf,
      meeting.openingItem,
      labels,
      x,
      cursorY,
      width,
      standaloneLast && !meeting.introduction && (meeting.leadItems ?? []).length === 0,
      layout,
    );
  }

  if (meeting.introduction) {
    cursorY = drawProgramRow(
      pdf,
      meeting.introduction,
      labels,
      x,
      cursorY,
      width,
      standaloneLast,
      layout,
    );
  }

  for (const item of meeting.leadItems ?? []) {
    cursorY = drawProgramRow(pdf, item, labels, x, cursorY, width, false, layout);
  }

  meeting.sections.forEach((section, sectionIndex) => {
    const style = SECTION_STYLES[section.key];
    const isFinalSection = sectionIndex === lastSectionIndex && !hasConclusion && !hasClosing;

    cursorY = drawSectionWithBackground(
      pdf,
      {
        title: getSectionLabel(labels, section.key),
        icon: section.key,
        strong: style.strong,
        light: style.light,
      },
      section.items,
      labels,
      x,
      cursorY,
      width,
      isFinalSection ? section.items.length - 1 : null,
      layout,
    );
  });

  if (meeting.conclusion) {
    cursorY = drawProgramRow(
      pdf,
      meeting.conclusion,
      labels,
      x,
      cursorY,
      width,
      !hasClosing,
      layout,
    );
  }

  if (meeting.closingItem) {
    cursorY = drawProgramRow(pdf, meeting.closingItem, labels, x, cursorY, width, true, layout);
  }

  return cursorY;
}

export function measureMeetingBlock(
  pdf: Pdf,
  meeting: MeetingPdfData,
  labels: MeetingPdfLabels,
  contentWidth: number,
  layout: PdfLayout = PDF_LAYOUT,
): number {
  let height = layout.dateBandHeight + layout.dateBandGapAfter;

  const countRow = (item: MeetingPdfItem | undefined, isLast: boolean) => {
    if (!item) {
      return;
    }

    height += measureRowHeight(pdf, item, labels, contentWidth, isLast, layout);
  };

  const hasClosing = !!meeting.closingItem;
  const hasConclusion = !!meeting.conclusion;
  const lastSectionIndex = meeting.sections.length - 1;
  const standaloneLast = !hasClosing && !hasConclusion && meeting.sections.length === 0;

  countRow(meeting.openingItem, standaloneLast && !meeting.introduction);

  if (meeting.introduction) {
    countRow(meeting.introduction, standaloneLast);
  }

  for (const item of meeting.leadItems ?? []) {
    countRow(item, false);
  }

  meeting.sections.forEach((section, sectionIndex) => {
    height += layout.sectionBandHeight + layout.sectionGapAfter;

    const isFinalSection = sectionIndex === lastSectionIndex && !hasConclusion && !hasClosing;

    section.items.forEach((item, itemIndex) => {
      countRow(item, isFinalSection && itemIndex === section.items.length - 1);
    });
  });

  if (meeting.conclusion) {
    countRow(meeting.conclusion, !hasClosing);
  }

  countRow(meeting.closingItem, true);

  return height;
}

const FIT_CANDIDATES: Array<{ spacing: number; font: number }> = [
  { spacing: 1, font: 1 },
  { spacing: 0.9, font: 1 },
  { spacing: 0.8, font: 1 },
  { spacing: 0.7, font: 1 },
  { spacing: 0.7, font: 0.92 },
  { spacing: 0.7, font: 0.85 },
];

const scaledLayoutCache = new Map<string, PdfLayout>();

function cachedScaledLayout(spacing: number, font: number): PdfLayout {
  const key = `${spacing}|${font}`;
  const cached = scaledLayoutCache.get(key);

  if (cached) {
    return cached;
  }

  const layout = scalePdfLayout(spacing, font);
  scaledLayoutCache.set(key, layout);

  return layout;
}

export function fitPageLayout(
  measures: Array<(layout: PdfLayout) => number>,
  availableHeight: number,
): PdfLayout {
  let fallback = cachedScaledLayout(1, 1);

  for (const candidate of FIT_CANDIDATES) {
    const layout = cachedScaledLayout(candidate.spacing, candidate.font);
    fallback = layout;

    if (measures.every((measure) => measure(layout) <= availableHeight)) {
      return layout;
    }
  }

  return fallback;
}

export function buildFileName(
  meetings: Array<{ date: string }>,
  singlePrefix: string,
  pluralPrefix: string,
): string {
  const sorted = [...meetings].sort((first, second) => first.date.localeCompare(second.date));

  const firstDate = sorted[0]?.date ?? "sem-data";
  const lastDate = sorted.at(-1)?.date ?? "sem-data";
  const prefix = sorted.length === 1 ? singlePrefix : pluralPrefix;

  if (sorted.length === 1) {
    return `${prefix}-${firstDate}.pdf`;
  }

  return `${prefix}-${firstDate}-a-${lastDate}.pdf`;
}

export interface GenerateMeetingPdfOptions {
  meetings: MeetingPdfData[];
  labels: MeetingPdfLabels;
  documentTitle: string;
  filePrefixSingle: string;
  filePrefixPlural: string;
  createPdf: () => Pdf;
  perPage: number;
}

export function generateMeetingPdf(options: GenerateMeetingPdfOptions): void {
  const { meetings, labels } = options;

  if (meetings.length === 0) {
    return;
  }

  const pdf = options.createPdf();

  const sortedMeetings = [...meetings].sort((first, second) =>
    first.date.localeCompare(second.date),
  );

  const pages = planPages(sortedMeetings, options.perPage);

  const usableHeight = PDF_LAYOUT.pageHeight - PDF_LAYOUT.marginTop - PDF_LAYOUT.marginBottom;
  const headerTotal = PDF_LAYOUT.pageHeaderHeight + PDF_LAYOUT.pageHeaderGap;
  const blockGapTotal = (options.perPage - 1) * PDF_LAYOUT.blockGap;
  const blockHeight = (usableHeight - headerTotal - blockGapTotal) / options.perPage;

  pages.forEach((page, index) => {
    if (index > 0) {
      pdf.addPage();
    }

    const present = page.meetings.filter((meeting): meeting is MeetingPdfData => meeting !== null);

    const layout = fitPageLayout(
      present.map(
        (meeting) => (candidate: PdfLayout) =>
          measureMeetingBlock(pdf, meeting, labels, PDF_LAYOUT.contentWidth, candidate),
      ),
      blockHeight,
    );

    const headerMeeting = present[0] ?? null;
    let cursorY: number = PDF_LAYOUT.marginTop;

    if (headerMeeting) {
      drawPageHeader(
        pdf,
        headerMeeting,
        options.documentTitle,
        PDF_LAYOUT.marginX,
        cursorY,
        PDF_LAYOUT.contentWidth,
      );
      cursorY += PDF_LAYOUT.pageHeaderHeight + PDF_LAYOUT.pageHeaderGap;
    }

    present.forEach((meeting, meetingIndex) => {
      if (meetingIndex > 0) {
        pdf.setDrawColor(190, 190, 190);
        pdf.setLineWidth(0.2);
        pdf.line(PDF_LAYOUT.marginX, cursorY, PDF_LAYOUT.pageWidth - PDF_LAYOUT.marginX, cursorY);
        cursorY += PDF_LAYOUT.blockGap;
      }

      cursorY = drawMeetingBlock(
        pdf,
        meeting,
        labels,
        PDF_LAYOUT.marginX,
        cursorY,
        PDF_LAYOUT.contentWidth,
        layout,
      );
    });
  });

  const fileName = buildFileName(
    sortedMeetings,
    options.filePrefixSingle,
    options.filePrefixPlural,
  );

  pdf.save(fileName);
}

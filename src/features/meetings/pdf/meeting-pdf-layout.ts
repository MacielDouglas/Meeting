export const PDF_LAYOUT = {
  pageWidth: 210,
  pageHeight: 297,

  marginX: 13,
  marginTop: 8,
  marginBottom: 8,

  contentWidth: 184,

  pageHeaderHeight: 12.6,
  pageHeaderGap: 0.5,

  blockHeight: 129.5,
  blockGap: 8,

  congregationSize: 15,
  headerTitleSize: 9,
  subtitleSize: 7.6,

  dateBandTextSize: 9.8,

  sectionTitleSize: 9.8,
  bodyTextSize: 8.3,
  bodyTextSmallSize: 7.1,
  assigneeTextSize: 7.5,
  timeTextSize: 7.1,

  headerCongregationHeight: 6,
  headerRuleOffset: 1.5,
  headerRuleHeight: 0.5,
  headerTitleHeight: 4.7,

  dateBandHeight: 5.5,
  sectionBandHeight: 8.6,

  lineHeight: 3.8,
  subtitleLineHeight: 3.3,
  assigneeLineHeight: 3.7,

  openingRowHeight: 6.35,
  itemMinHeight: 6.35,
  songRowMinHeight: 6,
  compactRowMinHeight: 5,

  timeColumnWidth: 11.5,
  sectionIconWidth: 11.5,
  activityLeftPadding: 2.2,
  assigneeColumnWidth: 47,

  rowPaddingTop: 1.1,
  rowPaddingBottom: 1.05,
  sectionGapAfter: 0.3,
  dateBandGapAfter: 0.55,
  headerGapBeforeDateBand: 1.5,

  fullPageContentHeight: 281,
} as const;

export type Splitter = {
  splitTextToSize: (text: string, maxWidth: number) => string[];
};

export type PdfLayout = { [Key in keyof typeof PDF_LAYOUT]: number };

export function scalePdfLayout(spacing: number, font: number): PdfLayout {
  const scaleSpacing = (value: number) => Math.round(value * spacing * 100) / 100;
  const scaleFont = (value: number) => Math.round(value * font * 100) / 100;

  return {
    ...PDF_LAYOUT,
    sectionTitleSize: scaleFont(PDF_LAYOUT.sectionTitleSize),
    bodyTextSize: scaleFont(PDF_LAYOUT.bodyTextSize),
    bodyTextSmallSize: scaleFont(PDF_LAYOUT.bodyTextSmallSize),
    assigneeTextSize: scaleFont(PDF_LAYOUT.assigneeTextSize),
    timeTextSize: scaleFont(PDF_LAYOUT.timeTextSize),
    dateBandTextSize: scaleFont(PDF_LAYOUT.dateBandTextSize),
    dateBandHeight: scaleSpacing(PDF_LAYOUT.dateBandHeight),
    sectionBandHeight: scaleSpacing(PDF_LAYOUT.sectionBandHeight),
    lineHeight: scaleSpacing(PDF_LAYOUT.lineHeight),
    subtitleLineHeight: scaleSpacing(PDF_LAYOUT.subtitleLineHeight),
    assigneeLineHeight: scaleSpacing(PDF_LAYOUT.assigneeLineHeight),
    itemMinHeight: scaleSpacing(PDF_LAYOUT.itemMinHeight),
    songRowMinHeight: scaleSpacing(PDF_LAYOUT.songRowMinHeight),
    compactRowMinHeight: scaleSpacing(PDF_LAYOUT.compactRowMinHeight),
    rowPaddingTop: scaleSpacing(PDF_LAYOUT.rowPaddingTop),
    rowPaddingBottom: scaleSpacing(PDF_LAYOUT.rowPaddingBottom),
    sectionGapAfter: scaleSpacing(PDF_LAYOUT.sectionGapAfter),
    dateBandGapAfter: scaleSpacing(PDF_LAYOUT.dateBandGapAfter),
  };
}

export type PdfPageLayout<T = unknown> = {
  meetings: (T | null)[];
};

function normalizeText(value: string | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function splitPdfText(doc: Splitter, value: string | undefined, width: number): string[] {
  const text = normalizeText(value);

  if (!text) {
    return [];
  }

  return doc.splitTextToSize(text, width).filter(Boolean);
}

export function getColumnMetrics(contentWidth: number) {
  const timeColumnWidth = PDF_LAYOUT.timeColumnWidth;
  const assigneeColumnWidth = PDF_LAYOUT.assigneeColumnWidth;
  const activityLeftPadding = PDF_LAYOUT.activityLeftPadding;

  const activityWidth =
    contentWidth - timeColumnWidth - assigneeColumnWidth - activityLeftPadding - 2;

  return {
    timeColumnWidth,
    assigneeColumnWidth,
    activityLeftPadding,
    activityWidth: Math.max(activityWidth, 40),
  };
}

export function planPages<T>(meetings: T[], perPage: number): PdfPageLayout<T>[] {
  const pages: PdfPageLayout<T>[] = [];

  for (let index = 0; index < meetings.length; index += perPage) {
    const slice = meetings.slice(index, index + perPage);
    while (slice.length < perPage) slice.push(null as unknown as T);
    pages.push({ meetings: slice });
  }

  return pages;
}

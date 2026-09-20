// Apostila (mwb): monta o JSON da edição no formato MeetingWorkbook.
// Duas fontes:
// - .jwpub: via pacote meeting-schedules-parser (MIT), que descriptografa
//   o Content (campos ricos como content/questions podem vir vazios);
// - .json: conteúdo completo no formato { name, weeks: [...] }.
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadPub } from "meeting-schedules-parser/dist/node/index.js";
import {
  detectLanguageFromFilename,
  type JwpubLanguage,
  languageSuffix,
  MONTH_NAMES_TITLE,
  openPublicationDb,
} from "@/features/meeting-content/infrastructure/jwpub-parser";

export interface WorkbookContentPart {
  title: string;
  number: number;
  duration?: string;
  format?: string;
  content?: string | string[];
  questions?: string[];
  territory?: string;
  assignment?: string;
}

export interface WorkbookContentMeeting {
  song?: {
    openingSong?: string;
    middleSong?: string;
    closingSong?: string;
    duration?: string;
  }[];
  openingSong?: string;
  middleSong?: string;
  closingSong?: string;
  openingPrayer?: boolean;
  closingPrayer?: boolean;
  openingComments?: string;
  concludingComments?: string;
  BibleReading?: string;
  "TREASURES FROM GODS WORD"?: WorkbookContentPart[];
  "APPLY YOURSELF TO THE FIELD MINISTRY"?: WorkbookContentPart[];
  "LIVING AS CHRISTIANS"?: WorkbookContentPart[];
}

export interface WorkbookContentWeek {
  week: string;
  /** Segunda-feira da semana em AAAA-MM-DD (presente em importações novas). */
  weekStart?: string;
  meeting: WorkbookContentMeeting;
}

export interface WorkbookContent {
  name: string;
  weeks: WorkbookContentWeek[];
  coverInformation?: Record<string, string>;
  additionalInformation?: Record<string, string>;
}

export interface ParsedWorkbook {
  kind: "workbook";
  language: JwpubLanguage;
  symbol: string;
  name: string;
  content: WorkbookContent;
}

type LibWeek = Record<string, string | number | undefined>;

const COMMENTS: Record<JwpubLanguage, { opening: string; concluding: string; song: string }> = {
  es: {
    opening: "Palabras de introducción (1 min.)",
    concluding: "Palabras de conclusión (3 mins.)",
    song: "Canción",
  },
  pt: {
    opening: "Palavras de introdução (1 min.)",
    concluding: "Palavras de conclusão (3 min.)",
    song: "Cântico",
  },
  en: {
    opening: "Opening Comments (1 min.)",
    concluding: "Concluding Comments (3 min.)",
    song: "Song",
  },
};

function asText(value: string | number | undefined): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function asSong(value: string | number | undefined, language: JwpubLanguage): string | null {
  if (value == null) return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) return null;
  return `${COMMENTS[language].song} ${number}`;
}

function parseLeadingNumber(title: string | null): number | null {
  if (!title) return null;
  const match = title.match(/^(\d+)\.\s+/);
  return match ? Number(match[1]) : null;
}

function stripLeadingNumber(title: string): string {
  return title.replace(/^\d+\.\s+/, "").trim();
}

function parseDurationMinutes(value: string | number | undefined): string | null {
  if (typeof value === "number" && Number.isInteger(value)) return `(${value} mins.)`;
  if (typeof value === "string") {
    const match = value.match(/\(\d+\s*mins?\.?\)/i);
    if (match) return match[0];
  }
  return null;
}

function splitTerritory(text: string): { territory?: string; assignment: string } {
  const dot = text.indexOf(". ");
  if (dot > 0) {
    const head = text.slice(0, dot).trim();
    if (head.length >= 3 && head === head.toUpperCase()) {
      return { territory: `${head}.`, assignment: text.slice(dot + 2).trim() };
    }
  }
  return { assignment: text };
}

function toISODateFromSlash(value: string): string {
  return value.replaceAll("/", "-");
}

function buildMonthsLabel(weekStarts: string[], language: JwpubLanguage): string {
  const months: number[] = [];
  let year = 0;
  for (const start of weekStarts) {
    const [yearText, monthText] = start.split("-");
    year = Number(yearText);
    const month = Number(monthText);
    if (!months.includes(month)) months.push(month);
  }
  months.sort((a, b) => a - b);
  const names = MONTH_NAMES_TITLE[language];
  const joiner = language === "pt" ? " e " : language === "en" ? " and " : " y ";
  const de = language === "en" ? " " : " de ";
  return `${months.map((month) => names[month - 1]).join(joiner)}${de}${year}`;
}

function mapWeek(
  raw: LibWeek,
  language: JwpubLanguage,
): {
  week: string;
  weekStart: string;
  meeting: WorkbookContentMeeting;
} {
  const weekStart = toISODateFromSlash(String(raw.mwb_week_date ?? ""));
  const weekLabel = (asText(raw.mwb_week_date_locale) ?? weekStart).toLowerCase();
  const comments = COMMENTS[language];

  const treasures: WorkbookContentPart[] = [];
  const talkTitle = asText(raw.mwb_tgw_talk_title) ?? asText(raw.mwb_tgw_talk);
  if (talkTitle) {
    treasures.push({
      title: stripLeadingNumber(talkTitle),
      number: parseLeadingNumber(talkTitle) ?? 1,
      duration: parseDurationMinutes(raw.mwb_tgw_talk_time) ?? "(10 mins.)",
    });
  }
  const gemsTitle = asText(raw.mwb_tgw_gems_title);
  if (gemsTitle) {
    treasures.push({
      title: stripLeadingNumber(gemsTitle),
      number: parseLeadingNumber(gemsTitle) ?? 2,
      duration: parseDurationMinutes(raw.mwb_tgw_gems_time) ?? "(10 mins.)",
    });
  }
  const breadTitle = asText(raw.mwb_tgw_bread_title) ?? asText(raw.mwb_tgw_bread);
  if (breadTitle) {
    const part: WorkbookContentPart = {
      title: stripLeadingNumber(breadTitle),
      number: parseLeadingNumber(breadTitle) ?? 3,
      duration: parseDurationMinutes(raw.mwb_tgw_bread_time) ?? "(4 mins.)",
    };
    const assignment = asText(raw.mwb_tgw_bread);
    if (assignment && assignment !== breadTitle) part.assignment = assignment;
    treasures.push(part);
  }

  const ministry: WorkbookContentPart[] = [];
  const ayfCount = Number(raw.mwb_ayf_count ?? 0);
  for (let index = 1; index <= ayfCount; index++) {
    const title = asText(raw[`mwb_ayf_part${index}_title`]) ?? asText(raw[`mwb_ayf_part${index}`]);
    if (!title) continue;
    const detail = asText(raw[`mwb_ayf_part${index}`]) ?? "";
    const { territory, assignment } = splitTerritory(detail);
    const part: WorkbookContentPart = {
      title: stripLeadingNumber(title),
      number: parseLeadingNumber(title) ?? 3 + index,
      duration: parseDurationMinutes(raw[`mwb_ayf_part${index}_time`]) ?? "(4 mins.)",
      assignment,
    };
    if (territory) part.territory = territory;
    ministry.push(part);
  }

  const living: WorkbookContentPart[] = [];
  const lcCount = Number(raw.mwb_lc_count ?? 0);
  for (let index = 1; index <= lcCount; index++) {
    const title = asText(raw[`mwb_lc_part${index}_title`]) ?? asText(raw[`mwb_lc_part${index}`]);
    if (!title) continue;
    const part: WorkbookContentPart = {
      title: stripLeadingNumber(title),
      number: parseLeadingNumber(title) ?? 6 + index,
      duration: parseDurationMinutes(raw[`mwb_lc_part${index}_time`]) ?? "(15 mins.)",
    };
    const format = asText(raw[`mwb_lc_part${index}_content`]);
    if (format) part.format = format;
    living.push(part);
  }
  const cbsTitle = asText(raw.mwb_lc_cbs_title);
  if (cbsTitle) {
    const part: WorkbookContentPart = {
      title: stripLeadingNumber(cbsTitle),
      number: parseLeadingNumber(cbsTitle) ?? 8,
      duration: parseDurationMinutes(raw.mwb_lc_cbs_time) ?? "(30 mins.)",
    };
    const assignment = asText(raw.mwb_lc_cbs);
    if (assignment) part.assignment = assignment;
    living.push(part);
  }

  return {
    week: weekLabel,
    weekStart,
    meeting: {
      song: [
        {
          openingSong: asSong(raw.mwb_song_first, language) ?? undefined,
          middleSong: asSong(raw.mwb_song_middle, language) ?? undefined,
          closingSong: asSong(raw.mwb_song_conclude, language) ?? undefined,
        },
      ],
      openingPrayer: true,
      closingPrayer: true,
      openingComments: comments.opening,
      concludingComments: comments.concluding,
      BibleReading: asText(raw.mwb_weekly_bible_reading) ?? undefined,
      "TREASURES FROM GODS WORD": treasures,
      "APPLY YOURSELF TO THE FIELD MINISTRY": ministry,
      "LIVING AS CHRISTIANS": living,
    },
  };
}

function stripDuplicationSuffix(name: string): string {
  return name.replace(/\s*\(\d+\)(?=\.\w+$)/i, "");
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolve a segunda-feira (AAAA-MM-DD) de uma semana da apostila salva sem
 * `weekStart` (importações antigas). O rótulo vem de `mwb_week_date_locale`,
 * ex. "6-12 de julio" — sem ano — então o ano é extraído do nome da edição,
 * ex. "Apostila ... (julio de 2026)". Devolve null se não conseguir.
 */
export function resolveWorkbookWeekStart(weekLabel: string, issueName: string): string | null {
  const normalized = weekLabel.trim().toLowerCase();
  const yearMatch = issueName.match(/(\d{4})\s*\)?\s*$/);
  if (!yearMatch) return null;
  const year = Number(yearMatch[1]);

  const allMonths: { names: string[]; language: JwpubLanguage }[] = (
    Object.keys(MONTH_NAMES_TITLE) as JwpubLanguage[]
  ).map((language) => ({ names: MONTH_NAMES_TITLE[language], language }));
  const monthIndexOf = (name: string): number => {
    const lowered = name.toLowerCase();
    for (const { names } of allMonths) {
      const index = names.findIndex((month) => month.toLowerCase() === lowered);
      if (index >= 0) return index + 1;
    }
    return 0;
  };

  // "6-12 de julio" (es/pt) ou "august 11-17" (en).
  const latinMatch = normalized.match(
    /^(\d{1,2})\s*[–—-]\s*(\d{1,2})\s+de\s+([a-zçãõéíúâêôàüñ]+)\s*$/,
  );
  const englishMatch = normalized.match(/^([a-z]+)\s+(\d{1,2})\s*[–—-]\s*(\d{1,2})\s*$/);
  let day: number | null = null;
  let month: number | null = null;
  if (latinMatch) {
    day = Number(latinMatch[1]);
    month = monthIndexOf(latinMatch[3]);
  } else if (englishMatch) {
    day = Number(englishMatch[2]);
    month = monthIndexOf(englishMatch[1]);
  }
  if (!day || !month || day < 1 || day > 31 || month < 1 || month > 12) return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (!ISO_DATE_PATTERN.test(iso)) return null;
  // Valida data real (ex.: rejeita 30 de fevereiro).
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return iso;
}

export async function parseWorkbookJwpub(
  buffer: Buffer,
  filename: string,
): Promise<ParsedWorkbook> {
  const normalizedFilename = stripDuplicationSuffix(filename);
  const language = detectLanguageFromFilename(normalizedFilename);
  if (!language) {
    throw new Error("Idioma não identificado pelo nome do arquivo (use _S, _T ou _E).");
  }
  const { db, manifest } = await openPublicationDb(buffer, normalizedFilename);
  let pubSymbol = "";
  let issueNumber: number | null = manifest.publication?.issueNumber ?? null;
  let baseTitle = manifest.publication?.title ?? normalizedFilename;
  try {
    const pubStmt = db.prepare(
      "SELECT Symbol AS symbol, IssueNumber AS issueNumber, Title AS title FROM Publication LIMIT 1",
    );
    if (pubStmt.step()) {
      const row = pubStmt.getAsObject() as unknown as {
        symbol: string;
        issueNumber: number;
        title: string;
      };
      if (row.symbol) pubSymbol = String(row.symbol);
      if (row.issueNumber) issueNumber = Number(row.issueNumber);
      if (row.title) baseTitle = String(row.title);
    }
    pubStmt.free();
  } finally {
    db.close();
  }

  // A lib valida o nome exato do arquivo: o temp precisa manter o nome normalizado.
  const safeName = normalizedFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const tempPath = join("D:\\temp", safeName);
  await writeFile(tempPath, buffer);
  let rawWeeks: LibWeek[];
  try {
    rawWeeks = (await loadPub(tempPath)) as unknown as LibWeek[];
  } finally {
    const { unlink } = await import("node:fs/promises");
    await unlink(tempPath).catch(() => undefined);
  }
  if (!Array.isArray(rawWeeks) || rawWeeks.length === 0) {
    throw new Error("Nenhuma semana encontrada no arquivo.");
  }
  const mapped = rawWeeks.map((raw) => mapWeek(raw, language));
  const months = buildMonthsLabel(
    mapped.map((week) => week.weekStart),
    language,
  );
  const name = `${baseTitle.replace(/\s+\d{4}\s*$/, "").trim()} (${months})`;
  const issue = String(issueNumber ?? 0).padStart(2, "0");
  const symbol = `${pubSymbol}.${issue}-${languageSuffix(language)}`;
  return {
    kind: "workbook",
    language,
    symbol,
    name,
    content: {
      name,
      weeks: mapped.map(({ week, weekStart, meeting }) => ({ week, weekStart, meeting })),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Valida e normaliza um .json no formato { name, weeks: [...] }.
export function parseWorkbookJson(text: string, filename: string): ParsedWorkbook {
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Arquivo .json inválido.");
  }
  if (!isRecord(data) || !Array.isArray(data.weeks) || data.weeks.length === 0) {
    throw new Error("O .json precisa ter { name, weeks: [...] } com ao menos uma semana.");
  }
  for (const week of data.weeks) {
    if (!isRecord(week) || typeof week.week !== "string" || !isRecord(week.meeting)) {
      throw new Error("Cada semana precisa ter { week, meeting }.");
    }
  }
  const normalizedFilename = stripDuplicationSuffix(filename);
  const language =
    detectLanguageFromFilename(normalizedFilename.replace(/\.json$/i, ".jwpub")) ?? "es";
  const name = typeof data.name === "string" && data.name.trim() !== "" ? data.name : filename;
  const symbolMatch = name.match(/(mwb\d+\.\d+)/i);
  const symbol = symbolMatch
    ? `${symbolMatch[1].toLowerCase()}-${languageSuffix(language)}`
    : filename.replace(/\.json$/i, "");
  const content = {
    name,
    weeks: data.weeks as WorkbookContentWeek[],
    ...(isRecord(data.coverInformation)
      ? { coverInformation: data.coverInformation as Record<string, string> }
      : {}),
    ...(isRecord(data.additionalInformation)
      ? { additionalInformation: data.additionalInformation as Record<string, string> }
      : {}),
  };
  return { kind: "workbook", language, symbol, name, content };
}

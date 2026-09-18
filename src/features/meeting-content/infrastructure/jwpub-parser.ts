// Parser de arquivos .jwpub (formato JW Library).
// Estrutura: ZIP externo { manifest.json, contents } onde `contents`
// é outro ZIP contendo o banco SQLite `<symbol>.db`.
// - Cânticos (sjj): número em PublicationViewItem.Title (filhos do grupo
//   "NÚMERO"), tema em Document.Title via DefaultDocumentId.
// - Esboços (S-34): Document.Title já vem no formato "N. Tema".
// - Sentinela estudo (w): artigos com Class='40'; semana via DatedText
//   (pareado por ordem); cânticos via Extract "sjj canción N"
//   (primeiro = inicial, último = final).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import AdmZip from "adm-zip";
import initSqlJs, { type Database } from "sql.js";

export type JwpubLanguage = "es" | "pt" | "en";
export type JwpubKind = "songs" | "outlines" | "watchtower";

export interface ParsedItem {
  number: number;
  theme: string;
}

export interface ParsedJwpub {
  kind: "songs" | "outlines";
  language: JwpubLanguage;
  symbol: string;
  title: string;
  items: ParsedItem[];
}

export interface ParsedWatchtowerArticle {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  title: string;
  openingSong: number | null;
  closingSong: number | null;
}

export interface ParsedWatchtower {
  kind: "watchtower";
  language: JwpubLanguage;
  symbol: string;
  name: string;
  year: number | null;
  issueNumber: number | null;
  articles: ParsedWatchtowerArticle[];
}

let sqlJsPromise: Promise<Awaited<ReturnType<typeof initSqlJs>>> | null = null;

async function getSqlJs() {
  if (!sqlJsPromise) {
    sqlJsPromise = (async () => {
      const wasmPath = join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm");
      const wasmFile = await readFile(wasmPath);
      const wasmBinary = wasmFile.buffer.slice(
        wasmFile.byteOffset,
        wasmFile.byteOffset + wasmFile.byteLength,
      );
      return initSqlJs({ wasmBinary });
    })();
  }
  return sqlJsPromise;
}

export function detectLanguageFromFilename(filename: string): JwpubLanguage | null {
  // Tolera data da edição e sufixos de download duplicado:
  // "S-34_S(2).jwpub", "sjj_S (1).jwpub", "w_S_202606.jwpub".
  const match = filename.match(/_([STE])(?:_\d{4,6})?(?:\s*\(\d+\))?\.jwpub$/i);
  if (!match) return null;
  const code = match[1].toUpperCase();
  if (code === "S") return "es";
  if (code === "T") return "pt";
  return "en";
}

interface Manifest {
  publication?: {
    symbol?: string;
    uniqueSymbol?: string;
    fileName?: string;
    title?: string;
    year?: number;
    issueNumber?: number;
  };
}

function detectKind(symbol: string, filename: string): JwpubKind | null {
  const normalized = symbol.trim().toLowerCase();
  if (normalized === "sjj" || normalized.startsWith("sjj")) return "songs";
  if (normalized === "s-34" || normalized === "s-034") return "outlines";
  if (/^w\d*$/.test(normalized)) return "watchtower";
  const base = filename.toLowerCase();
  if (base.startsWith("sjj")) return "songs";
  if (base.startsWith("s-34") || base.startsWith("s-034")) return "outlines";
  if (base.startsWith("w_") || base.startsWith("w-")) return "watchtower";
  return null;
}

function parseSongs(db: Database): ParsedItem[] {
  // Filhos do grupo "NÚMERO" têm Title puramente numérico.
  const stmt = db.prepare(
    "SELECT Title AS title, DefaultDocumentId AS docId FROM PublicationViewItem",
  );
  const numericItems: { title: string; docId: number }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as unknown as { title: string; docId: number };
    if (typeof row.title === "string" && /^\d+$/.test(row.title.trim())) {
      numericItems.push({ title: row.title.trim(), docId: Number(row.docId) });
    }
  }
  stmt.free();
  const items: ParsedItem[] = [];
  for (const item of numericItems) {
    const docStmt = db.prepare("SELECT Title AS title FROM Document WHERE DocumentId = ?");
    docStmt.bind([item.docId]);
    if (docStmt.step()) {
      const row = docStmt.getAsObject() as unknown as { title: string };
      const theme = String(row.title ?? "").trim();
      if (theme) items.push({ number: Number(item.title), theme });
    }
    docStmt.free();
  }
  return items.sort((a, b) => a.number - b.number);
}

function parseOutlines(db: Database): ParsedItem[] {
  const stmt = db.prepare("SELECT Title AS title FROM Document");
  const items: ParsedItem[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as unknown as { title: string };
    const title = String(row.title ?? "").trim();
    const match = title.match(/^(\d+)\.\s+(.+)$/);
    if (match) items.push({ number: Number(match[1]), theme: match[2].trim() });
  }
  stmt.free();
  return items.sort((a, b) => a.number - b.number);
}

const MONTH_NAMES: Record<JwpubLanguage, string[]> = {
  es: [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ],
  pt: [
    "JANEIRO",
    "FEVEREIRO",
    "MARÇO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO",
  ],
  en: [
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER",
  ],
};

const MONTH_NAMES_TITLE: Record<JwpubLanguage, string[]> = {
  es: [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ],
  pt: [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
};

function splitDateOffset(value: number): { year: number; month: number; day: number } {
  const text = String(value).padStart(8, "0");
  return {
    year: Number(text.slice(0, 4)),
    month: Number(text.slice(4, 6)),
    day: Number(text.slice(6, 8)),
  };
}

function toISODate(value: number): string {
  const { year, month, day } = splitDateOffset(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

function buildWeekLabel(start: number, end: number, language: JwpubLanguage): string {
  const first = splitDateOffset(start);
  const last = splitDateOffset(end);
  const months = MONTH_NAMES[language];
  if (first.year === last.year && first.month === last.month) {
    return `${first.day}-${last.day} DE ${months[first.month - 1]} DE ${first.year}`;
  }
  return `${first.day} DE ${months[first.month - 1]} - ${last.day} DE ${months[last.month - 1]} DE ${last.year}`;
}

interface OpenedPublication {
  db: Database;
  manifest: Manifest;
  language: JwpubLanguage;
  symbol: string;
}

async function openPublicationDb(buffer: Buffer, filename: string): Promise<OpenedPublication> {
  const language = detectLanguageFromFilename(filename);
  if (!language) {
    throw new Error(
      "Idioma não identificado pelo nome do arquivo (use _S, _T ou _E). Informe o idioma manualmente.",
    );
  }
  let outer: AdmZip;
  try {
    outer = new AdmZip(buffer);
  } catch {
    throw new Error("Arquivo inválido: não foi possível abrir o .jwpub.");
  }
  const manifestEntry = outer.getEntry("manifest.json");
  const contentsEntry = outer.getEntry("contents");
  if (!manifestEntry || !contentsEntry) {
    throw new Error("Arquivo .jwpub inválido (manifest.json ou contents ausente).");
  }
  let manifest: Manifest;
  try {
    manifest = JSON.parse(manifestEntry.getData().toString("utf-8")) as Manifest;
  } catch {
    throw new Error("Arquivo .jwpub inválido (manifest.json ilegível).");
  }
  const symbol = manifest.publication?.uniqueSymbol ?? manifest.publication?.symbol ?? "";
  const inner = new AdmZip(contentsEntry.getData());
  const dbName = manifest.publication?.fileName ?? "";
  const dbEntry =
    (dbName ? inner.getEntry(dbName) : null) ??
    inner.getEntries().find((entry) => entry.entryName.endsWith(".db"));
  if (!dbEntry) {
    throw new Error("Banco de dados não encontrado dentro do .jwpub.");
  }
  const SQL = await getSqlJs();
  const db = new SQL.Database(new Uint8Array(dbEntry.getData()));
  return { db, manifest, language, symbol };
}

export async function parseJwpub(
  buffer: Buffer,
  filename: string,
  languageOverride?: JwpubLanguage,
): Promise<ParsedJwpub> {
  const result = await inspectJwpubFile(buffer, filename);
  if (result.kind === "watchtower") {
    throw new Error("Este é um arquivo de A Sentinela. Importe pela aba Sentinela.");
  }
  if (languageOverride && languageOverride !== result.language) {
    return { ...result, language: languageOverride };
  }
  return result;
}

function languageSuffix(language: JwpubLanguage): string {
  if (language === "pt") return "T";
  if (language === "en") return "E";
  return "S";
}

function parseWatchtowerArticles(db: Database, language: JwpubLanguage): ParsedWatchtowerArticle[] {
  const articles: { documentId: number; title: string }[] = [];
  const articleStmt = db.prepare(
    "SELECT DocumentId AS documentId, Title AS title FROM Document WHERE Class = '40' ORDER BY DocumentId",
  );
  while (articleStmt.step()) {
    const row = articleStmt.getAsObject() as unknown as { documentId: number; title: string };
    const title = String(row.title ?? "").trim();
    if (title) articles.push({ documentId: Number(row.documentId), title });
  }
  articleStmt.free();

  const weeks: { start: number; end: number }[] = [];
  const weekStmt = db.prepare(
    "SELECT FirstDateOffset AS start, LastDateOffset AS end FROM DatedText ORDER BY FirstDateOffset",
  );
  while (weekStmt.step()) {
    const row = weekStmt.getAsObject() as unknown as { start: number; end: number };
    if (row.start && row.end) weeks.push({ start: Number(row.start), end: Number(row.end) });
  }
  weekStmt.free();

  return articles.map((article, index) => {
    const songNumbers: number[] = [];
    const extractStmt = db.prepare(
      `SELECT e.Caption AS caption FROM Extract e
       JOIN DocumentExtract d ON d.ExtractId = e.ExtractId
       WHERE d.DocumentId = ? ORDER BY d.SortPosition`,
    );
    extractStmt.bind([article.documentId]);
    while (extractStmt.step()) {
      const row = extractStmt.getAsObject() as unknown as { caption: string };
      const caption = String(row.caption ?? "");
      const match = caption.match(/sjj\s+(?:canci[óo]n|c[âa]ntico|song)\s+(\d+)/i);
      if (match) songNumbers.push(Number(match[1]));
    }
    extractStmt.free();

    const week = weeks[index];
    return {
      weekStart: week ? toISODate(week.start) : "",
      weekEnd: week ? toISODate(week.end) : "",
      weekLabel: week ? buildWeekLabel(week.start, week.end, language) : "",
      title: article.title,
      openingSong: songNumbers.length > 0 ? songNumbers[0] : null,
      closingSong: songNumbers.length > 0 ? songNumbers[songNumbers.length - 1] : null,
    };
  });
}

function readWatchtowerIssue(
  db: Database,
  manifest: Manifest,
  language: JwpubLanguage,
  symbol: string,
  filename: string,
): Omit<ParsedWatchtower, "kind" | "language"> {
  const pubStmt = db.prepare(
    "SELECT Symbol AS symbol, Year AS year, IssueNumber AS issueNumber FROM Publication LIMIT 1",
  );
  let pubSymbol = symbol;
  let year: number | null = manifest.publication?.year ?? null;
  let issueNumber: number | null = manifest.publication?.issueNumber ?? null;
  if (pubStmt.step()) {
    const row = pubStmt.getAsObject() as unknown as {
      symbol: string;
      year: number;
      issueNumber: number;
    };
    if (row.symbol) pubSymbol = String(row.symbol);
    if (row.year) year = Number(row.year);
    if (row.issueNumber) issueNumber = Number(row.issueNumber);
  }
  pubStmt.free();

  const articles = parseWatchtowerArticles(db, language);
  if (articles.length === 0) {
    throw new Error("Nenhum artigo de estudo encontrado no arquivo.");
  }
  const issue = String(issueNumber ?? 0).padStart(2, "0");
  const displaySymbol = `${pubSymbol}.${issue}-${languageSuffix(language)}`;
  const magazineName =
    language === "pt" ? "A Sentinela" : language === "en" ? "The Watchtower" : "La Atalaya";
  const monthName =
    issueNumber != null && issueNumber >= 1 && issueNumber <= 12
      ? MONTH_NAMES_TITLE[language][issueNumber - 1]
      : null;
  const de = language === "en" ? " " : " de ";
  const name =
    monthName && year
      ? `${magazineName}, ${monthName}${de}${year}`
      : (manifest.publication?.title ?? filename);
  return { symbol: displaySymbol, name, year, issueNumber, articles };
}

// Inspeção unificada: abre o .jwpub uma vez, identifica o tipo
// (cânticos, esboços ou Sentinela) e devolve o conteúdo sem salvar.
export async function inspectJwpubFile(
  buffer: Buffer,
  filename: string,
): Promise<ParsedJwpub | ParsedWatchtower> {
  const { db, manifest, language, symbol } = await openPublicationDb(buffer, filename);
  try {
    const kind = detectKind(symbol, filename);
    if (kind === "watchtower") {
      return { kind, language, ...readWatchtowerIssue(db, manifest, language, symbol, filename) };
    }
    if (!kind) {
      throw new Error(
        `Tipo de arquivo não identificado (símbolo "${symbol}"). Suportados: cânticos (sjj), esboços (S-34) e Sentinela (w).`,
      );
    }
    const items = kind === "songs" ? parseSongs(db) : parseOutlines(db);
    if (items.length === 0) {
      throw new Error("Nenhum item encontrado no arquivo. Verifique se o arquivo é válido.");
    }
    return { kind, language, symbol, title: manifest.publication?.title ?? filename, items };
  } finally {
    db.close();
  }
}

export async function parseWatchtowerJwpub(
  buffer: Buffer,
  filename: string,
): Promise<ParsedWatchtower> {
  const result = await inspectJwpubFile(buffer, filename);
  if (result.kind !== "watchtower") {
    throw new Error("Este arquivo não é uma edição de A Sentinela (w).");
  }
  return result;
}

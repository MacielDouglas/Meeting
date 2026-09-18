// Parser de arquivos .jwpub (formato JW Library).
// Estrutura: ZIP externo { manifest.json, contents } onde `contents`
// é outro ZIP contendo o banco SQLite `<symbol>.db`.
// - Cânticos (sjj): número em PublicationViewItem.Title (filhos do grupo
//   "NÚMERO"), tema em Document.Title via DefaultDocumentId.
// - Esboços (S-34): Document.Title já vem no formato "N. Tema".
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import AdmZip from "adm-zip";
import initSqlJs, { type Database } from "sql.js";

export type JwpubLanguage = "es" | "pt" | "en";
export type JwpubKind = "songs" | "outlines";

export interface ParsedItem {
  number: number;
  theme: string;
}

export interface ParsedJwpub {
  kind: JwpubKind;
  language: JwpubLanguage;
  symbol: string;
  title: string;
  items: ParsedItem[];
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
  // Tolera sufixos de download duplicado: "S-34_S(2).jwpub", "sjj_S (1).jwpub".
  const match = filename.match(/_([STE])(?:\s*\(\d+\))?\.jwpub$/i);
  if (!match) return null;
  const code = match[1].toUpperCase();
  if (code === "S") return "es";
  if (code === "T") return "pt";
  return "en";
}

interface Manifest {
  publication?: { symbol?: string; uniqueSymbol?: string; fileName?: string; title?: string };
}

function detectKind(symbol: string, filename: string): JwpubKind | null {
  const normalized = symbol.trim().toLowerCase();
  if (normalized === "sjj" || normalized.startsWith("sjj")) return "songs";
  if (normalized === "s-34" || normalized === "s-034") return "outlines";
  const base = filename.toLowerCase();
  if (base.startsWith("sjj")) return "songs";
  if (base.startsWith("s-34") || base.startsWith("s-034")) return "outlines";
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

export async function parseJwpub(
  buffer: Buffer,
  filename: string,
  languageOverride?: JwpubLanguage,
): Promise<ParsedJwpub> {
  const language = languageOverride ?? detectLanguageFromFilename(filename);
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
  const pubTitle = manifest.publication?.title ?? filename;
  const kind = detectKind(symbol, filename);
  if (!kind) {
    throw new Error(
      `Tipo de arquivo não identificado (símbolo "${symbol}"). Suportados: cânticos (sjj) e esboços (S-34).`,
    );
  }
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
  try {
    const items = kind === "songs" ? parseSongs(db) : parseOutlines(db);
    if (items.length === 0) {
      throw new Error("Nenhum item encontrado no arquivo. Verifique se o arquivo é válido.");
    }
    return { kind, language, symbol, title: pubTitle, items };
  } finally {
    db.close();
  }
}

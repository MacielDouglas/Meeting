import { readFile } from "node:fs/promises";
import { join } from "node:path";
import AdmZip from "adm-zip";
import { loadPub } from "meeting-schedules-parser/dist/node/index.js";
import initSqlJs from "sql.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseWorkbookJwpub,
  resolveWorkbookWeekStart,
} from "@/features/meeting-content/infrastructure/workbook-parser";

vi.mock("meeting-schedules-parser/dist/node/index.js", () => ({
  loadPub: vi.fn(),
}));

describe("resolveWorkbookWeekStart", () => {
  it("resolve rótulo es sem ano usando o nome da edição", () => {
    expect(resolveWorkbookWeekStart("6-12 de julio", "Apostila (julio de 2026)")).toBe(
      "2026-07-06",
    );
  });

  it("resolve rótulo pt", () => {
    expect(resolveWorkbookWeekStart("13-19 de setembro", "Apostila (setembro de 2025)")).toBe(
      "2025-09-13",
    );
  });

  it("devolve null sem ano ou com data inválida", () => {
    expect(resolveWorkbookWeekStart("6-12 de julio", "Apostila")).toBeNull();
    expect(
      resolveWorkbookWeekStart("30-31 de fevereiro", "Apostila (fevereiro de 2026)"),
    ).toBeNull();
    expect(resolveWorkbookWeekStart("semana qualquer", "Apostila (julio de 2026)")).toBeNull();
  });
});

const WORKBOOK_MANIFEST = JSON.stringify({
  publication: {
    uniqueSymbol: "mwb",
    fileName: "pub.db",
    title: "Guía de actividades 2027",
    issueNumber: 1,
  },
});

const WORKBOOK_DB_SQL = `
CREATE TABLE Publication (Symbol TEXT, Year INTEGER, IssueNumber INTEGER, Title TEXT);
INSERT INTO Publication (Symbol, Year, IssueNumber, Title)
  VALUES ('mwb', 2027, 1, 'Guía de actividades 2027');
`;

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

async function buildWorkbookJwpub(): Promise<Buffer> {
  const SQL = await getSqlJs();
  const db = new SQL.Database();
  db.run(WORKBOOK_DB_SQL);
  const dbBytes = Buffer.from(db.export());
  db.close();
  const inner = new AdmZip();
  inner.addFile("pub.db", dbBytes);
  const outer = new AdmZip();
  outer.addFile("manifest.json", Buffer.from(WORKBOOK_MANIFEST, "utf-8"));
  outer.addFile("contents", inner.toBuffer());
  return outer.toBuffer();
}

const FAKE_LIB_WEEKS = [
  {
    mwb_week_date: "2027/01/04",
    mwb_week_date_locale: "4-10 de enero",
    mwb_tgw_talk_title: "1. Título del discurso",
    mwb_tgw_talk_time: "(10 min.)",
    mwb_tgw_gems_title: "Busquemos perlas escondidas",
    mwb_tgw_gems_time: "(10 min.)",
    mwb_tgw_bread_title: "Lectura de la Biblia",
    mwb_tgw_bread: "Génesis 1:1-10",
    mwb_tgw_bread_time: "(4 min.)",
    mwb_ayf_count: 1,
    mwb_ayf_part1_title: "Empiece conversaciones",
    mwb_ayf_part1: "Empiece conversaciones (lmd lección 1).",
    mwb_ayf_part1_time: "(3 min.)",
    mwb_lc_count: 1,
    mwb_lc_part1_title: "Necesidades de la congregación",
    mwb_lc_part1_time: "(15 min.)",
    mwb_lc_part1_content: "Anuncios",
    mwb_lc_cbs_title: "Estudio bíblico",
    mwb_lc_cbs_time: "(30 min.)",
    mwb_lc_cbs: "Capítulo 5",
    mwb_song_first: 83,
    mwb_song_middle: 2,
    mwb_song_conclude: 164,
  },
];

describe("parseWorkbookJwpub", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("mapeia as semanas devolvidas pela lib (formato 2026 e 202701)", async () => {
    vi.mocked(loadPub).mockResolvedValue(FAKE_LIB_WEEKS);
    const parsed = await parseWorkbookJwpub(await buildWorkbookJwpub(), "mwb_S_202701.jwpub");
    expect(parsed.kind).toBe("workbook");
    expect(parsed.language).toBe("es");
    expect(parsed.symbol).toBe("mwb.01-S");
    expect(parsed.name).toBe("Guía de actividades (enero de 2027)");
    expect(parsed.content.weeks).toHaveLength(1);
    const week = parsed.content.weeks[0];
    expect(week?.week).toBe("4-10 de enero");
    expect(week?.weekStart).toBe("2027-01-04");
    expect(week?.meeting.song?.[0]).toMatchObject({
      openingSong: "Canción 83",
      middleSong: "Canción 2",
      closingSong: "Canción 164",
    });
    const treasures = week?.meeting["TREASURES FROM GODS WORD"] ?? [];
    expect(treasures[0]).toMatchObject({
      title: "Título del discurso",
      number: 1,
      duration: "(10 min.)",
    });
    expect(week?.meeting["LIVING AS CHRISTIANS"]?.[0]).toMatchObject({
      title: "Necesidades de la congregación",
      format: "Anuncios",
    });
  });

  it("troca o erro cru da lib (ex.: trim em edição nova) por mensagem amigável", async () => {
    vi.mocked(loadPub).mockRejectedValue(
      new TypeError("Cannot read properties of undefined (reading 'trim')"),
    );
    const error = await parseWorkbookJwpub(await buildWorkbookJwpub(), "mwb_S_202701.jwpub").catch(
      (cause: unknown) => cause,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("No se pudo extraer el contenido de la guía");
    expect((error as Error).message).not.toContain("trim");
    expect(console.error).toHaveBeenCalledWith(
      "[content] falha ao extrair semanas da apostila",
      expect.objectContaining({ filename: "mwb_S_202701.jwpub" }),
    );
  });
});

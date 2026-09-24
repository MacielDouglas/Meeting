import { readFile } from "node:fs/promises";
import { join } from "node:path";
import AdmZip from "adm-zip";
import initSqlJs from "sql.js";
import { describe, expect, it, vi } from "vitest";
import {
  detectLanguageFromFilename,
  inspectJwpubFile,
  languageSuffix,
  openPublicationDb,
  parseJwpub,
  parseWatchtowerJwpub,
} from "@/features/meeting-content/infrastructure/jwpub-parser";
import { parseWorkbookJwpub } from "@/features/meeting-content/infrastructure/workbook-parser";

vi.mock("@/features/meeting-content/infrastructure/workbook-parser", () => ({
  parseWorkbookJwpub: vi.fn(() =>
    Promise.resolve({
      kind: "workbook",
      language: "es",
      symbol: "mwb.01-S",
      name: "Apostila",
      content: { name: "Apostila", weeks: [] },
    }),
  ),
}));

const EMPTY_SQL = "CREATE TABLE t (x INTEGER);";

const SONGS_SQL = `
CREATE TABLE PublicationViewItem (Title TEXT, DefaultDocumentId INTEGER);
CREATE TABLE Document (DocumentId INTEGER, Title TEXT);
INSERT INTO PublicationViewItem (Title, DefaultDocumentId)
  VALUES ('145', 2), ('Índice', 0), (' 144 ', 1), ('143', 99);
INSERT INTO Document (DocumentId, Title)
  VALUES (1, 'Jehová te bendecirá'), (2, 'Casi a diario');
`;

const EMPTY_SONGS_SQL = `
CREATE TABLE PublicationViewItem (Title TEXT, DefaultDocumentId INTEGER);
CREATE TABLE Document (DocumentId INTEGER, Title TEXT);
INSERT INTO PublicationViewItem (Title, DefaultDocumentId) VALUES ('Mis cantos', 1);
INSERT INTO Document (DocumentId, Title) VALUES (1, 'Tema oculto');
`;

const OUTLINES_SQL = `
CREATE TABLE Document (Title TEXT);
INSERT INTO Document (Title)
  VALUES ('Portada'), ('1. Tema A'), ('2. Tema B'), ('12. Tema C'), ('3.sin espacio');
`;

const WATCHTOWER_ES_SQL = `
CREATE TABLE Publication (Symbol TEXT, Year INTEGER, IssueNumber INTEGER);
CREATE TABLE Document (DocumentId INTEGER, Title TEXT, Class TEXT);
CREATE TABLE DatedText (FirstDateOffset INTEGER, LastDateOffset INTEGER);
CREATE TABLE Extract (ExtractId INTEGER, Caption TEXT);
CREATE TABLE DocumentExtract (DocumentId INTEGER, ExtractId INTEGER, SortPosition INTEGER);
INSERT INTO Publication (Symbol, Year, IssueNumber) VALUES ('w', 2026, 6);
INSERT INTO Document (DocumentId, Title, Class)
  VALUES (10, 'Cómo ser feliz', '40'), (11, 'Confía en Dios', '40'), (12, 'Apéndice', '1');
INSERT INTO DatedText (FirstDateOffset, LastDateOffset)
  VALUES (20260601, 20260607), (20260608, 20260614);
INSERT INTO Extract (ExtractId, Caption)
  VALUES (1, 'sjj canción 144'), (2, 'sjj canción 145'), (3, 'Génesis 1:1');
INSERT INTO DocumentExtract (DocumentId, ExtractId, SortPosition)
  VALUES (10, 1, 1), (10, 2, 2), (10, 3, 3);
`;

const WATCHTOWER_PT_SQL = `
CREATE TABLE Publication (Symbol TEXT, Year INTEGER, IssueNumber INTEGER);
CREATE TABLE Document (DocumentId INTEGER, Title TEXT, Class TEXT);
CREATE TABLE DatedText (FirstDateOffset INTEGER, LastDateOffset INTEGER);
CREATE TABLE Extract (ExtractId INTEGER, Caption TEXT);
CREATE TABLE DocumentExtract (DocumentId INTEGER, ExtractId INTEGER, SortPosition INTEGER);
INSERT INTO Publication (Symbol, Year, IssueNumber) VALUES ('w', 2026, 6);
INSERT INTO Document (DocumentId, Title, Class) VALUES (10, 'Seja feliz', '40');
INSERT INTO DatedText (FirstDateOffset, LastDateOffset) VALUES (20260601, 20260607);
INSERT INTO Extract (ExtractId, Caption) VALUES (1, 'sjj cântico 146');
INSERT INTO DocumentExtract (DocumentId, ExtractId, SortPosition) VALUES (10, 1, 1);
`;

const WATCHTOWER_CROSS_SQL = `
CREATE TABLE Publication (Symbol TEXT, Year INTEGER, IssueNumber INTEGER);
CREATE TABLE Document (DocumentId INTEGER, Title TEXT, Class TEXT);
CREATE TABLE DatedText (FirstDateOffset INTEGER, LastDateOffset INTEGER);
CREATE TABLE Extract (ExtractId INTEGER, Caption TEXT);
CREATE TABLE DocumentExtract (DocumentId INTEGER, ExtractId INTEGER, SortPosition INTEGER);
INSERT INTO Publication (Symbol, Year, IssueNumber) VALUES ('w', 2026, 12);
INSERT INTO Document (DocumentId, Title, Class) VALUES (10, 'Fin de año', '40');
INSERT INTO DatedText (FirstDateOffset, LastDateOffset) VALUES (20261228, 20270103);
`;

const WATCHTOWER_NO_ARTICLES_SQL = `
CREATE TABLE Publication (Symbol TEXT, Year INTEGER, IssueNumber INTEGER);
CREATE TABLE Document (DocumentId INTEGER, Title TEXT, Class TEXT);
CREATE TABLE DatedText (FirstDateOffset INTEGER, LastDateOffset INTEGER);
CREATE TABLE Extract (ExtractId INTEGER, Caption TEXT);
CREATE TABLE DocumentExtract (DocumentId INTEGER, ExtractId INTEGER, SortPosition INTEGER);
INSERT INTO Publication (Symbol, Year, IssueNumber) VALUES ('w', 2026, 6);
INSERT INTO Document (DocumentId, Title, Class) VALUES (10, 'Sin clase 40', '1');
INSERT INTO DatedText (FirstDateOffset, LastDateOffset) VALUES (20260601, 20260607);
`;

const SONGS_MANIFEST = JSON.stringify({
  publication: { uniqueSymbol: "sjj", fileName: "pub.db", title: "Canciones de alabanza" },
});

const WATCHTOWER_MANIFEST = JSON.stringify({
  publication: { uniqueSymbol: "w", fileName: "pub.db", year: 2026, issueNumber: 6 },
});

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

async function createDb(sql: string): Promise<Buffer> {
  const SQL = await getSqlJs();
  const db = new SQL.Database();
  db.run(sql);
  const bytes = Buffer.from(db.export());
  db.close();
  return bytes;
}

function zipOf(entries: Array<[string, Buffer]>): Buffer {
  const zip = new AdmZip();
  for (const [name, data] of entries) zip.addFile(name, data);
  return zip.toBuffer();
}

async function buildJwpub(manifestJson: string, sql?: string): Promise<Buffer> {
  const inner = new AdmZip();
  if (sql !== undefined) inner.addFile("pub.db", await createDb(sql));
  return zipOf([
    ["manifest.json", Buffer.from(manifestJson, "utf-8")],
    ["contents", inner.toBuffer()],
  ]);
}

describe("detectLanguageFromFilename", () => {
  it("mapeia os sufixos _S, _T e _E para es, pt e en", () => {
    expect(detectLanguageFromFilename("sjj_S.jwpub")).toBe("es");
    expect(detectLanguageFromFilename("sjj_T.jwpub")).toBe("pt");
    expect(detectLanguageFromFilename("sjj_E.jwpub")).toBe("en");
  });

  it("tolera a data da edição e o sufixo de download duplicado", () => {
    expect(detectLanguageFromFilename("w_S_202606.jwpub")).toBe("es");
    expect(detectLanguageFromFilename("S-34_S (2).jwpub")).toBe("es");
    expect(detectLanguageFromFilename("sjj_T (1).jwpub")).toBe("pt");
  });

  it("aceita o sufixo em minúsculas", () => {
    expect(detectLanguageFromFilename("sjj_t.jwpub")).toBe("pt");
  });

  it("devolve null quando não há sufixo de idioma", () => {
    expect(detectLanguageFromFilename("reuniao-salva.jwpub")).toBeNull();
    expect(detectLanguageFromFilename("sjj.jwpub")).toBeNull();
  });
});

describe("languageSuffix", () => {
  it("devolve o sufixo da publicação por idioma", () => {
    expect(languageSuffix("es")).toBe("S");
    expect(languageSuffix("pt")).toBe("T");
    expect(languageSuffix("en")).toBe("E");
  });
});

describe("inspectJwpubFile", () => {
  it("identifica cânticos pelo uniqueSymbol do manifest", async () => {
    const buffer = await buildJwpub(SONGS_MANIFEST, SONGS_SQL);
    await expect(inspectJwpubFile(buffer, "sjj_S.jwpub")).resolves.toEqual({
      kind: "songs",
      language: "es",
      symbol: "sjj",
      title: "Canciones de alabanza",
      items: [
        { number: 144, theme: "Jehová te bendecirá" },
        { number: 145, theme: "Casi a diario" },
      ],
    });
  });

  it("identifica esboços pelo symbol alternativo s-034", async () => {
    const manifest = JSON.stringify({
      publication: { symbol: "s-034", fileName: "pub.db", title: "Esbozos" },
    });
    const buffer = await buildJwpub(manifest, OUTLINES_SQL);
    await expect(inspectJwpubFile(buffer, "S-34_T.jwpub")).resolves.toEqual({
      kind: "outlines",
      language: "pt",
      symbol: "s-034",
      title: "Esbozos",
      items: [
        { number: 1, theme: "Tema A" },
        { number: 2, theme: "Tema B" },
        { number: 12, theme: "Tema C" },
      ],
    });
  });

  it("usa o nome do arquivo quando o manifest não tem símbolo", async () => {
    const manifest = JSON.stringify({
      publication: { fileName: "pub.db", title: "Canciones" },
    });
    const buffer = await buildJwpub(manifest, SONGS_SQL);
    const result = await inspectJwpubFile(buffer, "sjj_S.jwpub");
    expect(result).toMatchObject({ kind: "songs", symbol: "" });
    expect(result).toMatchObject({
      items: [
        { number: 144, theme: "Jehová te bendecirá" },
        { number: 145, theme: "Casi a diario" },
      ],
    });
  });

  it("identifica a apostila mwb e delega ao leitor da apostila", async () => {
    const manifest = JSON.stringify({
      publication: { uniqueSymbol: "mwb", fileName: "pub.db" },
    });
    const buffer = await buildJwpub(manifest, EMPTY_SQL);
    const result = await inspectJwpubFile(buffer, "mwb_S.jwpub");
    expect(result).toEqual({
      kind: "workbook",
      language: "es",
      symbol: "mwb.01-S",
      name: "Apostila",
      content: { name: "Apostila", weeks: [] },
    });
    expect(parseWorkbookJwpub).toHaveBeenCalledWith(buffer, "mwb_S.jwpub");
  });

  it("rejeita símbolo desconhecido citando o símbolo no erro", async () => {
    const manifest = JSON.stringify({
      publication: { uniqueSymbol: "xyz", fileName: "pub.db" },
    });
    const buffer = await buildJwpub(manifest, EMPTY_SQL);
    await expect(inspectJwpubFile(buffer, "arquivo_S.jwpub")).rejects.toThrow(
      'Tipo de archivo no identificado (símbolo "xyz")',
    );
  });

  it("rejeita cânticos sem nenhum elemento", async () => {
    const buffer = await buildJwpub(SONGS_MANIFEST, EMPTY_SONGS_SQL);
    await expect(inspectJwpubFile(buffer, "sjj_S.jwpub")).rejects.toThrow(
      "Ningún elemento encontrado en el archivo.",
    );
  });
});

describe("parseJwpub", () => {
  it("devolve os cânticos com itens ordenados por número", async () => {
    const buffer = await buildJwpub(SONGS_MANIFEST, SONGS_SQL);
    await expect(parseJwpub(buffer, "sjj_S.jwpub")).resolves.toEqual({
      kind: "songs",
      language: "es",
      symbol: "sjj",
      title: "Canciones de alabanza",
      items: [
        { number: 144, theme: "Jehová te bendecirá" },
        { number: 145, theme: "Casi a diario" },
      ],
    });
  });

  it("aplica o languageOverride quando difere do detectado no nome", async () => {
    const buffer = await buildJwpub(SONGS_MANIFEST, SONGS_SQL);
    const result = await parseJwpub(buffer, "sjj_S.jwpub", "pt");
    expect(result.language).toBe("pt");
    expect(result.items).toHaveLength(2);
  });

  it("rejeita arquivo que não é cântico nem esboço", async () => {
    const buffer = await buildJwpub(WATCHTOWER_MANIFEST, WATCHTOWER_ES_SQL);
    await expect(parseJwpub(buffer, "w_S_202606.jwpub")).rejects.toThrow(
      "Este archivo no es de cánticos ni de esbozos.",
    );
  });
});

describe("parseWatchtowerJwpub", () => {
  it("monta artigos com semanas e cânticos inicial e final", async () => {
    const buffer = await buildJwpub(WATCHTOWER_MANIFEST, WATCHTOWER_ES_SQL);
    await expect(parseWatchtowerJwpub(buffer, "w_S_202606.jwpub")).resolves.toEqual({
      kind: "watchtower",
      language: "es",
      symbol: "w.06-S",
      name: "La Atalaya, junio de 2026",
      year: 2026,
      issueNumber: 6,
      articles: [
        {
          weekStart: "2026-06-01",
          weekEnd: "2026-06-07",
          weekLabel: "1-7 DE JUNIO DE 2026",
          title: "Cómo ser feliz",
          openingSong: 144,
          closingSong: 145,
        },
        {
          weekStart: "2026-06-08",
          weekEnd: "2026-06-14",
          weekLabel: "8-14 DE JUNIO DE 2026",
          title: "Confía en Dios",
          openingSong: null,
          closingSong: null,
        },
      ],
    });
  });

  it("no pt usa o nome da revista, o rótulo e o cântico localizado", async () => {
    const buffer = await buildJwpub(WATCHTOWER_MANIFEST, WATCHTOWER_PT_SQL);
    await expect(parseWatchtowerJwpub(buffer, "w_T_202606.jwpub")).resolves.toEqual({
      kind: "watchtower",
      language: "pt",
      symbol: "w.06-T",
      name: "A Sentinela, junho de 2026",
      year: 2026,
      issueNumber: 6,
      articles: [
        {
          weekStart: "2026-06-01",
          weekEnd: "2026-06-07",
          weekLabel: "1-7 DE JUNHO DE 2026",
          title: "Seja feliz",
          openingSong: 146,
          closingSong: 146,
        },
      ],
    });
  });

  it("rotula semana que cruza meses e anos", async () => {
    const manifest = JSON.stringify({
      publication: { uniqueSymbol: "w", fileName: "pub.db", year: 2026, issueNumber: 12 },
    });
    const buffer = await buildJwpub(manifest, WATCHTOWER_CROSS_SQL);
    const result = await parseWatchtowerJwpub(buffer, "w_S_202612.jwpub");
    expect(result.articles[0]).toMatchObject({
      weekStart: "2026-12-28",
      weekEnd: "2027-01-03",
      weekLabel: "28 DE DICIEMBRE - 3 DE ENERO DE 2027",
      title: "Fin de año",
      openingSong: null,
      closingSong: null,
    });
    expect(result.name).toBe("La Atalaya, diciembre de 2026");
    expect(result.symbol).toBe("w.12-S");
  });

  it("rejeita quando o arquivo não tem artigos da sentinela", async () => {
    const buffer = await buildJwpub(WATCHTOWER_MANIFEST, WATCHTOWER_NO_ARTICLES_SQL);
    await expect(parseWatchtowerJwpub(buffer, "w_S_202606.jwpub")).rejects.toThrow(
      "Ningún artículo de estudio encontrado en el archivo.",
    );
  });

  it("rejeita arquivo que não é edição da sentinela", async () => {
    const buffer = await buildJwpub(SONGS_MANIFEST, SONGS_SQL);
    await expect(parseWatchtowerJwpub(buffer, "sjj_S.jwpub")).rejects.toThrow(
      "Este archivo no es una edición de La Atalaya (w).",
    );
  });
});

describe("openPublicationDb", () => {
  it("exige o sufixo de idioma no nome do arquivo", async () => {
    await expect(openPublicationDb(Buffer.from("x"), "reuniao.jwpub")).rejects.toThrow(
      "Idioma no identificado por el nombre del archivo (usa _S, _T o _E).",
    );
  });

  it("rejeita buffer que não é um zip", async () => {
    await expect(openPublicationDb(Buffer.from("no es un zip"), "sjj_S.jwpub")).rejects.toThrow(
      "Archivo no válido: no se pudo abrir el .jwpub.",
    );
  });

  it("exige manifest.json e contents no zip externo", async () => {
    const manifest = Buffer.from(SONGS_MANIFEST, "utf-8");
    await expect(
      openPublicationDb(zipOf([["manifest.json", manifest]]), "sjj_S.jwpub"),
    ).rejects.toThrow("Archivo .jwpub no válido (manifest.json o contents ausente).");
    await expect(openPublicationDb(zipOf([["contents", manifest]]), "sjj_S.jwpub")).rejects.toThrow(
      "Archivo .jwpub no válido (manifest.json o contents ausente).",
    );
  });

  it("rejeita manifest.json ilegível", async () => {
    const buffer = await buildJwpub("{corrompido", EMPTY_SQL);
    await expect(openPublicationDb(buffer, "sjj_S.jwpub")).rejects.toThrow(
      "manifest.json ilegible",
    );
  });

  it("rejeita .jwpub sem banco de dados interno", async () => {
    const buffer = await buildJwpub(SONGS_MANIFEST);
    await expect(openPublicationDb(buffer, "sjj_S.jwpub")).rejects.toThrow(
      "Base de datos no encontrada dentro del .jwpub.",
    );
  });

  it("rejeita contents corrompido", async () => {
    const buffer = zipOf([
      ["manifest.json", Buffer.from(SONGS_MANIFEST, "utf-8")],
      ["contents", Buffer.from("no es un zip")],
    ]);
    await expect(openPublicationDb(buffer, "sjj_S.jwpub")).rejects.toThrow();
  });
});

"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwnerUser } from "@/features/auth/application/session";
import {
  detectLanguageFromFilename,
  inspectJwpubFile,
  type ParsedWatchtowerArticle,
  parseJwpub,
} from "@/features/meeting-content/infrastructure/jwpub-parser";
import type { ContentLanguage } from "@/features/meeting-content/infrastructure/meeting-content-schema";
import {
  meetingWorkbooks,
  songs,
  talkOutlines,
  watchtowerIssues,
} from "@/features/meeting-content/infrastructure/meeting-content-schema";
import type { WorkbookContentWeek } from "@/features/meeting-content/infrastructure/workbook-parser";
import { getDb } from "@/shared/lib/db";
import { plainText } from "@/shared/lib/validation";

const languageSchema = z.enum(["es", "pt", "en"]);
const idSchema = z.string().trim().min(1).max(64);

function revalidate() {
  revalidatePath("/reunioes");
}

function isPrivilegedError(error: unknown): boolean {
  return (
    error instanceof Error && (error.message === "FORBIDDEN" || error.message === "UNAUTHORIZED")
  );
}

export interface InspectedItem {
  number: number;
  theme: string;
}

export interface InspectResult {
  ok: boolean;
  error?: string;
  kind?: "songs" | "outlines";
  language?: ContentLanguage;
  source?: string;
  total?: number;
  items?: InspectedItem[];
  existingCount?: number;
  // true quando o conteúdo desse tipo+idioma já existe no banco
  hadExisting?: boolean;
}

async function upsertItems(
  kind: "songs" | "outlines",
  language: ContentLanguage,
  items: { number: number; theme: string }[],
  source: string,
): Promise<{ inserted: number; updated: number }> {
  const db = getDb();
  let inserted = 0;
  let updated = 0;
  for (const item of items) {
    if (kind === "songs") {
      const existing = await db
        .select({ id: songs.id })
        .from(songs)
        .where(and(eq(songs.number, item.number), eq(songs.language, language)))
        .limit(1);
      if (existing[0]) {
        await db
          .update(songs)
          .set({ theme: item.theme, source, updatedAt: new Date() })
          .where(eq(songs.id, existing[0].id));
        updated++;
      } else {
        await db.insert(songs).values({
          id: randomUUID(),
          number: item.number,
          theme: item.theme,
          language,
          source,
        });
        inserted++;
      }
    } else {
      const existing = await db
        .select({ id: talkOutlines.id })
        .from(talkOutlines)
        .where(and(eq(talkOutlines.number, item.number), eq(talkOutlines.language, language)))
        .limit(1);
      if (existing[0]) {
        await db
          .update(talkOutlines)
          .set({ theme: item.theme, source, updatedAt: new Date() })
          .where(eq(talkOutlines.id, existing[0].id));
        updated++;
      } else {
        await db.insert(talkOutlines).values({
          id: randomUUID(),
          number: item.number,
          theme: item.theme,
          language,
          source,
        });
        inserted++;
      }
    }
  }
  return { inserted, updated };
}

async function countExisting(
  kind: "songs" | "outlines",
  language: ContentLanguage,
): Promise<number> {
  const db = getDb();
  if (kind === "songs") {
    const rows = await db.select({ id: songs.id }).from(songs).where(eq(songs.language, language));
    return rows.length;
  }
  const rows = await db
    .select({ id: talkOutlines.id })
    .from(talkOutlines)
    .where(eq(talkOutlines.language, language));
  return rows.length;
}

export type AnyInspectResult =
  | { ok: false; error: string }
  | {
      ok: true;
      kind: "songs" | "outlines";
      language: ContentLanguage;
      source: string;
      total: number;
      items: InspectedItem[];
      existingCount: number;
      hadExisting: boolean;
    }
  | {
      ok: true;
      kind: "watchtower";
      language: ContentLanguage;
      source: string;
      symbol: string;
      name: string;
      articles: ParsedWatchtowerArticle[];
      hadExisting: boolean;
    }
  | {
      ok: true;
      kind: "workbook";
      language: ContentLanguage;
      source: string;
      symbol: string;
      name: string;
      weeks: WorkbookContentWeek[];
      hadExisting: boolean;
    };

// Inspeção inteligente: aceita qualquer .jwpub, identifica o tipo
// (cânticos, esboços, Sentinela ou apostila) e devolve o conteúdo sem salvar.
export async function inspectAnyJwpub(formData: FormData): Promise<AnyInspectResult> {
  try {
    await requireOwnerUser();
  } catch (error) {
    if (isPrivilegedError(error)) return { ok: false, error: "Solo owner/admin puede enviar." };
    return { ok: false, error: "No autenticado." };
  }
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Selecciona un archivo .jwpub." };
  if (!file.name.toLowerCase().endsWith(".jwpub")) {
    return { ok: false, error: "El archivo necesita extensión .jwpub." };
  }
  if (file.size > 200 * 1024 * 1024)
    return { ok: false, error: "Archivo muy grande (máx. 200 MB)." };
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await inspectJwpubFile(buffer, file.name);
    if (parsed.kind === "workbook") {
      const existing = await getDb()
        .select({ id: meetingWorkbooks.id })
        .from(meetingWorkbooks)
        .where(eq(meetingWorkbooks.symbol, parsed.symbol));
      return {
        ok: true,
        kind: "workbook",
        language: parsed.language,
        source: file.name,
        symbol: parsed.symbol,
        name: parsed.name,
        weeks: parsed.content.weeks,
        hadExisting: existing.length > 0,
      };
    }
    if (parsed.kind === "watchtower") {
      const existing = await getDb()
        .select({ id: watchtowerIssues.id })
        .from(watchtowerIssues)
        .where(eq(watchtowerIssues.symbol, parsed.symbol));
      return {
        ok: true,
        kind: "watchtower",
        language: parsed.language,
        source: file.name,
        symbol: parsed.symbol,
        name: parsed.name,
        articles: parsed.articles,
        hadExisting: existing.length > 0,
      };
    }
    const existing = await countExisting(parsed.kind, parsed.language);
    return {
      ok: true,
      kind: parsed.kind,
      language: parsed.language,
      source: file.name,
      total: parsed.items.length,
      items: parsed.items,
      existingCount: existing,
      hadExisting: existing > 0,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Fallo al leer el archivo.",
    };
  }
}

// Lê o arquivo .jwpub via FormData, identifica tipo (cânticos/esboços) e
// idioma (_S/_T/_E) e devolve o conteúdo SEM salvar, para o usuário revisar
// no modal antes de confirmar.
export async function inspectJwpub(formData: FormData): Promise<InspectResult> {
  try {
    await requireOwnerUser();
  } catch (error) {
    if (isPrivilegedError(error)) return { ok: false, error: "Solo owner/admin puede enviar." };
    return { ok: false, error: "No autenticado." };
  }
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Selecciona un archivo .jwpub." };
  if (!file.name.toLowerCase().endsWith(".jwpub")) {
    return { ok: false, error: "El archivo necesita extensión .jwpub." };
  }
  if (file.size > 200 * 1024 * 1024)
    return { ok: false, error: "Archivo muy grande (máx. 200 MB)." };
  let parsed: Awaited<ReturnType<typeof parseJwpub>>;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    parsed = await parseJwpub(buffer, file.name);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Fallo al leer el archivo.",
    };
  }
  try {
    const existing = await countExisting(parsed.kind, parsed.language);
    return {
      ok: true,
      kind: parsed.kind,
      language: parsed.language,
      source: file.name,
      total: parsed.items.length,
      items: parsed.items,
      existingCount: existing,
      hadExisting: existing > 0,
    };
  } catch {
    return { ok: false, error: "Fallo al verificar la base de datos." };
  }
}

const saveInspectedSchema = z.object({
  kind: z.enum(["songs", "outlines"]),
  language: languageSchema,
  source: plainText(120),
  items: z
    .array(z.object({ number: z.number().int().min(1).max(1000), theme: plainText(200) }))
    .min(1)
    .max(1000),
});

// Salva o conteúdo revisado/editado no modal (upsert por número+idioma).
export async function saveInspectedJwpub(input: unknown) {
  const parsed = saveInspectedSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Contenido no válido para guardar." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo owner/admin puede guardar." };
  }
  try {
    const { inserted, updated } = await upsertItems(
      parsed.data.kind,
      parsed.data.language,
      parsed.data.items,
      parsed.data.source,
    );
    revalidate();
    return { ok: true, inserted, updated, total: parsed.data.items.length };
  } catch {
    return { ok: false, error: "Fallo al guardar en la base de datos." };
  }
}

const manualSchema = z.object({
  kind: z.enum(["songs", "outlines"]),
  number: z.number().int().min(1).max(1000),
  theme: plainText(200),
  language: languageSchema,
});

export async function createManualItem(input: unknown) {
  const parsed = manualSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa número, tema e idioma." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo owner/admin puede crear." };
  }
  const { inserted } = await upsertItems(
    parsed.data.kind,
    parsed.data.language,
    [{ number: parsed.data.number, theme: parsed.data.theme }],
    "manual",
  );
  void inserted;
  revalidate();
  return { ok: true };
}

const updateSchema = z.object({
  kind: z.enum(["songs", "outlines"]),
  id: idSchema,
  number: z.number().int().min(1).max(1000),
  theme: plainText(200),
});

export async function updateManualItem(input: unknown) {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los datos." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo owner/admin puede editar." };
  }
  const db = getDb();
  if (parsed.data.kind === "songs") {
    await db
      .update(songs)
      .set({ number: parsed.data.number, theme: parsed.data.theme, updatedAt: new Date() })
      .where(eq(songs.id, parsed.data.id));
  } else {
    await db
      .update(talkOutlines)
      .set({ number: parsed.data.number, theme: parsed.data.theme, updatedAt: new Date() })
      .where(eq(talkOutlines.id, parsed.data.id));
  }
  revalidate();
  return { ok: true };
}

export async function deleteItem(input: unknown) {
  const parsed = z.object({ kind: z.enum(["songs", "outlines"]), id: idSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Registro no válido." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo owner/admin puede eliminar." };
  }
  const db = getDb();
  if (parsed.data.kind === "songs") {
    await db.delete(songs).where(eq(songs.id, parsed.data.id));
  } else {
    await db.delete(talkOutlines).where(eq(talkOutlines.id, parsed.data.id));
  }
  revalidate();
  return { ok: true };
}

export async function deleteAllByLanguage(input: unknown) {
  const parsed = z
    .object({ kind: z.enum(["songs", "outlines"]), language: languageSchema })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Selección no válida." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo owner/admin puede eliminar." };
  }
  const db = getDb();
  if (parsed.data.kind === "songs") {
    await db.delete(songs).where(eq(songs.language, parsed.data.language));
  } else {
    await db.delete(talkOutlines).where(eq(talkOutlines.language, parsed.data.language));
  }
  revalidate();
  return { ok: true };
}

export { detectLanguageFromFilename };

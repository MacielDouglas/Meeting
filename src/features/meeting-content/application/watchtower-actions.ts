"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwnerUser } from "@/features/auth/application/session";
import { parseWatchtowerJwpub } from "@/features/meeting-content/infrastructure/jwpub-parser";
import type { ContentLanguage } from "@/features/meeting-content/infrastructure/meeting-content-schema";
import {
  watchtowerArticles,
  watchtowerIssues,
} from "@/features/meeting-content/infrastructure/meeting-content-schema";
import { getDb } from "@/shared/lib/db";
import { plainText } from "@/shared/lib/validation";

const languageSchema = z.enum(["es", "pt", "en"]);
const idSchema = z.string().trim().min(1).max(64);

function revalidate() {
  revalidatePath("/reunioes");
}

export interface WatchtowerInspectItem {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  title: string;
  openingSong: number | null;
  closingSong: number | null;
}

export interface WatchtowerInspected {
  ok: true;
  symbol: string;
  name: string;
  language: ContentLanguage;
  source: string;
  articles: WatchtowerInspectItem[];
  hadExisting: boolean;
}

export type WatchtowerInspectResult = { ok: false; error: string } | WatchtowerInspected;

// Lê o .jwpub da Sentinela SEM salvar: devolve edição + artigos para o modal.
export async function inspectWatchtowerJwpub(formData: FormData): Promise<WatchtowerInspectResult> {
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo owner/admin puede enviar." };
  }
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Selecciona un archivo .jwpub." };
  if (!file.name.toLowerCase().endsWith(".jwpub")) {
    return { ok: false, error: "El archivo necesita extensión .jwpub." };
  }
  if (file.size > 100 * 1024 * 1024)
    return { ok: false, error: "Archivo muy grande (máx. 100 MB)." };
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseWatchtowerJwpub(buffer, file.name);
    const db = getDb();
    const existing = await db
      .select({ id: watchtowerIssues.id })
      .from(watchtowerIssues)
      .where(eq(watchtowerIssues.symbol, parsed.symbol));
    return {
      ok: true,
      symbol: parsed.symbol,
      name: parsed.name,
      language: parsed.language,
      source: file.name,
      articles: parsed.articles,
      hadExisting: existing.length > 0,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Fallo al leer el archivo.",
    };
  }
}

const saveWatchtowerSchema = z.object({
  symbol: plainText(40),
  name: plainText(120),
  language: languageSchema,
  source: plainText(120),
  articles: z
    .array(
      z.object({
        weekStart: z.string().trim().max(10),
        weekEnd: z.string().trim().max(10),
        weekLabel: plainText(80),
        title: plainText(200),
        openingSong: z.number().int().min(1).max(1000).nullable(),
        closingSong: z.number().int().min(1).max(1000).nullable(),
      }),
    )
    .min(1)
    .max(50),
});

// Salva a edição revisada (substitui a edição de mesmo símbolo, se houver).
export async function saveWatchtowerIssue(input: unknown) {
  const parsed = saveWatchtowerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Contenido no válido para guardar." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo owner/admin puede guardar." };
  }
  try {
    const db = getDb();
    await db.delete(watchtowerIssues).where(eq(watchtowerIssues.symbol, parsed.data.symbol));
    const issueId = randomUUID();
    await db.insert(watchtowerIssues).values({
      id: issueId,
      symbol: parsed.data.symbol,
      name: parsed.data.name,
      language: parsed.data.language,
      year: null,
      issueNumber: null,
      source: parsed.data.source,
    });
    let order = 0;
    for (const article of parsed.data.articles) {
      await db.insert(watchtowerArticles).values({
        id: randomUUID(),
        issueId,
        weekStart: article.weekStart || null,
        weekEnd: article.weekEnd || null,
        weekLabel: article.weekLabel,
        title: article.title,
        openingSong: article.openingSong,
        closingSong: article.closingSong,
        sortOrder: order++,
      });
    }
    revalidate();
    return { ok: true, total: parsed.data.articles.length };
  } catch {
    return { ok: false, error: "Fallo al guardar en la base de datos." };
  }
}

export async function deleteWatchtowerIssue(input: unknown) {
  const parsed = z.object({ id: idSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Edición no válida." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo owner/admin puede eliminar." };
  }
  await getDb().delete(watchtowerIssues).where(eq(watchtowerIssues.id, parsed.data.id));
  revalidate();
  return { ok: true };
}

const updateArticleSchema = z.object({
  id: idSchema,
  weekLabel: plainText(80),
  title: plainText(200),
  openingSong: z.number().int().min(1).max(1000).nullable(),
  closingSong: z.number().int().min(1).max(1000).nullable(),
});

export async function updateWatchtowerArticle(input: unknown) {
  const parsed = updateArticleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los datos del estudio." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo owner/admin puede editar." };
  }
  await getDb()
    .update(watchtowerArticles)
    .set({
      weekLabel: parsed.data.weekLabel,
      title: parsed.data.title,
      openingSong: parsed.data.openingSong,
      closingSong: parsed.data.closingSong,
    })
    .where(eq(watchtowerArticles.id, parsed.data.id));
  revalidate();
  return { ok: true };
}

export async function deleteWatchtowerArticle(input: unknown) {
  const parsed = z.object({ id: idSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Estudio no válido." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo owner/admin puede eliminar." };
  }
  await getDb().delete(watchtowerArticles).where(eq(watchtowerArticles.id, parsed.data.id));
  revalidate();
  return { ok: true };
}

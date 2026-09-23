"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwnerUser } from "@/features/auth/application/session";
import type { ContentLanguage } from "@/features/meeting-content/infrastructure/meeting-content-schema";
import { meetingWorkbooks } from "@/features/meeting-content/infrastructure/meeting-content-schema";
import {
  parseWorkbookJson,
  parseWorkbookJwpub,
  type WorkbookContentWeek,
} from "@/features/meeting-content/infrastructure/workbook-parser";
import { getDb } from "@/shared/lib/db";
import { plainText } from "@/shared/lib/validation";

const idSchema = z.string().trim().min(1).max(64);

function revalidate() {
  revalidatePath("/reunioes");
}

export interface WorkbookInspected {
  ok: true;
  kind: "workbook";
  language: ContentLanguage;
  source: string;
  symbol: string;
  name: string;
  weeks: WorkbookContentWeek[];
  hadExisting: boolean;
}

export type WorkbookInspectResult = { ok: false; error: string } | WorkbookInspected;

// Lê o .jwpub da apostila SEM salvar: devolve edição + semanas para o modal.
export async function inspectWorkbookJwpub(formData: FormData): Promise<WorkbookInspectResult> {
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo owner/admin puede enviar." };
  }
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Selecciona un archivo .jwpub o .json." };
  if (file.size > 200 * 1024 * 1024)
    return { ok: false, error: "Archivo muy grande (máx. 200 MB)." };
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();
    let parsed: Awaited<ReturnType<typeof parseWorkbookJwpub>>;

    if (fileName.endsWith(".json")) {
      const text = new TextDecoder().decode(buffer);
      parsed = parseWorkbookJson(text, file.name);
    } else if (fileName.endsWith(".jwpub")) {
      parsed = await parseWorkbookJwpub(buffer, file.name);
    } else {
      return { ok: false, error: "Formato no soportado. Envía un .jwpub o .json." };
    }

    const db = getDb();
    const existing = await db
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
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Fallo al leer el archivo.",
    };
  }
}

const saveWorkbookSchema = z.object({
  symbol: plainText(40),
  name: plainText(160),
  language: z.enum(["es", "pt", "en"]),
  source: plainText(120),
  content: z.string().min(1),
});

// Salva a edição revisada (substitui a edição de mesmo símbolo, se houver).
export async function saveWorkbookIssue(input: unknown) {
  const parsed = saveWorkbookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Contenido no válido para guardar." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo owner/admin puede guardar." };
  }
  try {
    const db = getDb();
    await db.delete(meetingWorkbooks).where(eq(meetingWorkbooks.symbol, parsed.data.symbol));
    await db.insert(meetingWorkbooks).values({
      id: randomUUID(),
      symbol: parsed.data.symbol,
      name: parsed.data.name,
      language: parsed.data.language,
      content: parsed.data.content,
      source: parsed.data.source || null,
    });
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Fallo al guardar en la base de datos." };
  }
}

export async function updateWorkbookContent(input: unknown) {
  const parsed = z.object({ id: idSchema, content: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Contenido no válido." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo owner/admin puede editar." };
  }
  await getDb()
    .update(meetingWorkbooks)
    .set({ content: parsed.data.content, updatedAt: new Date() })
    .where(eq(meetingWorkbooks.id, parsed.data.id));
  revalidate();
  return { ok: true };
}

export async function deleteWorkbookIssue(input: unknown) {
  const parsed = z.object({ id: idSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Edición no válida." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo owner/admin puede eliminar." };
  }
  await getDb().delete(meetingWorkbooks).where(eq(meetingWorkbooks.id, parsed.data.id));
  revalidate();
  return { ok: true };
}

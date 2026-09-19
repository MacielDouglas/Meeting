"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwnerUser } from "@/features/auth/application/session";
import {
  CLEANING_SECTORS_DEFAULTS,
  CLEANING_TYPES,
  type CleaningTypeKey,
} from "@/features/cleaning/domain/cleaning-defaults";
import { cleaningSectors, cleaningTypes } from "@/features/cleaning/infrastructure/cleaning-schema";
import { getDb } from "@/shared/lib/db";
import { plainText } from "@/shared/lib/validation";

const typeKeySchema = z.enum(["per_meeting", "weekly", "general"]);
const modeSchema = z.enum(["person", "family", "group"]);
const sexSchema = z.enum(["any", "male", "female"]);
const idSchema = z.string().trim().min(1).max(64);

function revalidate() {
  revalidatePath("/configuracion");
}

async function ensureTypesSeeded() {
  const db = getDb();
  const existing = await db.select({ key: cleaningTypes.key }).from(cleaningTypes);
  const existingKeys = new Set(existing.map((row) => row.key));
  for (const def of CLEANING_TYPES) {
    if (!existingKeys.has(def.key)) {
      await db.insert(cleaningTypes).values({ id: randomUUID(), key: def.key });
    }
  }
}

async function nextSortOrder(typeKey: CleaningTypeKey): Promise<number> {
  const rows = await getDb()
    .select({ sortOrder: cleaningSectors.sortOrder })
    .from(cleaningSectors)
    .where(eq(cleaningSectors.cleaningTypeKey, typeKey));
  return rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
}

export async function toggleCleaningType(input: { key: CleaningTypeKey; enabled: boolean }) {
  const parsed = z.object({ key: typeKeySchema, enabled: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Tipo de limpeza inválido." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Somente o owner pode alterar." };
  }
  await ensureTypesSeeded();
  await getDb()
    .insert(cleaningTypes)
    .values({ id: randomUUID(), key: parsed.data.key, enabled: parsed.data.enabled })
    .onConflictDoUpdate({
      target: cleaningTypes.key,
      set: { enabled: parsed.data.enabled, updatedAt: new Date() },
    });
  revalidate();
  return { ok: true };
}

export async function setCleaningAssignmentMode(input: {
  key: CleaningTypeKey;
  mode: "person" | "family" | "group";
}) {
  const parsed = z.object({ key: typeKeySchema, mode: modeSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Modo inválido." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Somente o owner pode alterar." };
  }
  await ensureTypesSeeded();
  await getDb()
    .insert(cleaningTypes)
    .values({ id: randomUUID(), key: parsed.data.key, assignmentMode: parsed.data.mode })
    .onConflictDoUpdate({
      target: cleaningTypes.key,
      set: { assignmentMode: parsed.data.mode, updatedAt: new Date() },
    });
  revalidate();
  return { ok: true };
}

const sectorSchema = z.object({
  typeKey: typeKeySchema,
  name: plainText(80),
  task: z.string().trim().max(2000),
  peopleCount: z.number().int().min(1).max(50).optional().nullable(),
  requiredSex: sexSchema,
  allowYoung: z.boolean().optional().default(true),
});

export async function createCleaningSector(input: unknown) {
  const parsed = sectorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Verifique nome, tarefa e quantidade." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Somente o owner pode criar setores." };
  }
  await ensureTypesSeeded();
  await getDb()
    .insert(cleaningSectors)
    .values({
      id: randomUUID(),
      cleaningTypeKey: parsed.data.typeKey,
      key: null,
      name: parsed.data.name,
      task: parsed.data.task,
      enabled: true,
      peopleCount: parsed.data.peopleCount ?? null,
      requiredSex: parsed.data.requiredSex,
      allowYoung: parsed.data.allowYoung ?? true,
      isDefault: false,
      sortOrder: await nextSortOrder(parsed.data.typeKey),
    });
  revalidate();
  return { ok: true };
}

const updateSectorSchema = z.object({
  id: idSchema,
  name: plainText(80),
  task: z.string().trim().max(2000),
  peopleCount: z.number().int().min(1).max(50).optional().nullable(),
  requiredSex: sexSchema,
  allowYoung: z.boolean().optional().default(true),
});

export async function updateCleaningSector(input: unknown) {
  const parsed = updateSectorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Verifique os dados do setor." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Somente o owner pode editar." };
  }
  await getDb()
    .update(cleaningSectors)
    .set({
      name: parsed.data.name,
      task: parsed.data.task,
      peopleCount: parsed.data.peopleCount ?? null,
      requiredSex: parsed.data.requiredSex,
      allowYoung: parsed.data.allowYoung ?? true,
      updatedAt: new Date(),
    })
    .where(eq(cleaningSectors.id, parsed.data.id));
  revalidate();
  return { ok: true };
}

export async function toggleCleaningSector(input: { id: string; enabled: boolean }) {
  const parsed = z.object({ id: idSchema, enabled: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Setor inválido." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Somente o owner pode alterar." };
  }
  await getDb()
    .update(cleaningSectors)
    .set({ enabled: parsed.data.enabled, updatedAt: new Date() })
    .where(eq(cleaningSectors.id, parsed.data.id));
  revalidate();
  return { ok: true };
}

export async function deleteCleaningSector(input: unknown) {
  const parsed = z.object({ id: idSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Setor inválido." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Somente o owner pode excluir." };
  }
  await getDb().delete(cleaningSectors).where(eq(cleaningSectors.id, parsed.data.id));
  revalidate();
  return { ok: true };
}

// Setores que exigem adulto por padrão (espelha AssignmentHub: banheiros = allowYoung false).
const ADULT_ONLY_SECTOR_KEYS = new Set(["banheiro_masculino", "banheiro_feminino", "banheiros"]);
const SECTOR_SEX_DEFAULTS: Record<string, "any" | "male" | "female"> = {
  banheiro_masculino: "male",
  banheiro_feminino: "female",
};
export async function restoreDefaultCleaningSectors(input: { key: CleaningTypeKey }) {
  const parsed = z.object({ key: typeKeySchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Tipo inválido." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Somente o owner pode restaurar." };
  }
  await ensureTypesSeeded();
  const db = getDb();
  const existing = await db
    .select({ key: cleaningSectors.key })
    .from(cleaningSectors)
    .where(eq(cleaningSectors.cleaningTypeKey, parsed.data.key));
  const existingKeys = new Set(existing.map((row) => row.key));
  const missing = CLEANING_SECTORS_DEFAULTS.filter(
    (def) => def.typeKey === parsed.data.key && !existingKeys.has(def.key),
  );
  let order = await nextSortOrder(parsed.data.key);
  for (const def of missing) {
    await db.insert(cleaningSectors).values({
      id: randomUUID(),
      cleaningTypeKey: def.typeKey,
      key: def.key,
      name: def.name,
      task: def.task,
      enabled: true,
      peopleCount: null,
      requiredSex: SECTOR_SEX_DEFAULTS[def.key] ?? "any",
      allowYoung: !ADULT_ONLY_SECTOR_KEYS.has(def.key),
      isDefault: true,
      sortOrder: order++,
    });
  }
  // Semeia tudo caso a tabela esteja vazia (primeira execução)
  if (existing.length === 0 && missing.length === 0) {
    const defaults = CLEANING_SECTORS_DEFAULTS.filter((def) => def.typeKey === parsed.data.key);
    for (const def of defaults) {
      await db.insert(cleaningSectors).values({
        id: randomUUID(),
        cleaningTypeKey: def.typeKey,
        key: def.key,
        name: def.name,
        task: def.task,
        enabled: true,
        peopleCount: null,
        requiredSex: SECTOR_SEX_DEFAULTS[def.key] ?? "any",
        allowYoung: !ADULT_ONLY_SECTOR_KEYS.has(def.key),
        isDefault: true,
        sortOrder: order++,
      });
    }
  }
  revalidate();
  return { ok: true, restored: missing.length };
}

export async function seedAllCleaningDefaults() {
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Somente o owner pode semear." };
  }
  await ensureTypesSeeded();
  for (const def of CLEANING_TYPES) {
    await restoreDefaultCleaningSectors({ key: def.key });
  }
  return { ok: true };
}

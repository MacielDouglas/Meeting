"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwnerUser } from "@/features/auth/application/session";
import { DESIGNATION_SECTORS_DEFAULTS } from "@/features/designations/domain/designation-defaults";
import {
  designationSectors,
  designationSlots,
} from "@/features/designations/infrastructure/designation-schema";
import { getDb } from "@/shared/lib/db";
import { plainText } from "@/shared/lib/validation";

const idSchema = z.string().trim().min(1).max(64);

function revalidate() {
  revalidatePath("/configuracion");
}

async function nextSectorOrder(): Promise<number> {
  const rows = await getDb()
    .select({ sortOrder: designationSectors.sortOrder })
    .from(designationSectors);
  return rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
}

export async function toggleDesignationSector(input: { id: string; enabled: boolean }) {
  const parsed = z.object({ id: idSchema, enabled: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Sector no válido." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo el owner puede cambiar." };
  }
  // Suporta toggle na pré-visualização padrão (semeia antes)
  let sectorId = parsed.data.id;
  if (sectorId.startsWith("default-")) {
    await seedDefaultDesignationSectors();
    const key = sectorId.replace("default-", "");
    const rows = await getDb()
      .select({ id: designationSectors.id })
      .from(designationSectors)
      .where(eq(designationSectors.key, key))
      .limit(1);
    if (!rows[0]) return { ok: false, error: "Sector no encontrado." };
    sectorId = rows[0].id;
  }
  await getDb()
    .update(designationSectors)
    .set({ enabled: parsed.data.enabled, updatedAt: new Date() })
    .where(eq(designationSectors.id, sectorId));
  revalidate();
  return { ok: true };
}

export async function updateDesignationSectorPeopleCount(input: {
  id: string;
  peopleCount: number | null;
}) {
  const parsed = z
    .object({ id: idSchema, peopleCount: z.number().int().min(1).max(50).nullable() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Cantidad no válida." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo el owner puede cambiar." };
  }
  let sectorId = parsed.data.id;
  if (sectorId.startsWith("default-")) {
    await seedDefaultDesignationSectors();
    const key = sectorId.replace("default-", "");
    const rows = await getDb()
      .select({ id: designationSectors.id })
      .from(designationSectors)
      .where(eq(designationSectors.key, key))
      .limit(1);
    if (!rows[0]) return { ok: false, error: "Sector no encontrado." };
    sectorId = rows[0].id;
  }
  await getDb()
    .update(designationSectors)
    .set({ peopleCount: parsed.data.peopleCount, updatedAt: new Date() })
    .where(eq(designationSectors.id, sectorId));
  revalidate();
  return { ok: true };
}

const createSectorSchema = z.object({
  name: plainText(80),
  peopleCount: z.number().int().min(1).max(50).optional().nullable(),
  slots: z.array(plainText(60)).max(20).optional().default([]),
});

export async function createDesignationSector(input: unknown) {
  const parsed = createSectorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa nombre, cantidad y plazas." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo el owner puede crear sectores." };
  }
  const sectorId = randomUUID();
  await getDb()
    .insert(designationSectors)
    .values({
      id: sectorId,
      key: null,
      name: parsed.data.name,
      personFlag: null,
      enabled: true,
      peopleCount: parsed.data.peopleCount ?? null,
      isDefault: false,
      sortOrder: await nextSectorOrder(),
    });
  let order = 0;
  for (const label of parsed.data.slots ?? []) {
    await getDb().insert(designationSlots).values({
      id: randomUUID(),
      sectorId,
      label,
      sortOrder: order++,
    });
  }
  revalidate();
  return { ok: true };
}

export async function deleteDesignationSector(input: unknown) {
  const parsed = z.object({ id: idSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Sector no válido." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo el owner puede eliminar." };
  }
  if (parsed.data.id.startsWith("default-"))
    return { ok: false, error: "Restaura los predeterminados primero." };
  await getDb().delete(designationSectors).where(eq(designationSectors.id, parsed.data.id));
  revalidate();
  return { ok: true };
}

const slotsSchema = z.object({
  sectorId: idSchema,
  slots: z.array(plainText(60)).max(20),
});

// Substitui as vagas nomeáveis do setor (ex: Setor A, Setor B / Câmera A, Câmera B).
export async function saveDesignationSlots(input: unknown) {
  const parsed = slotsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa las plazas informadas." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo el owner puede cambiar plazas." };
  }
  let sectorId = parsed.data.sectorId;
  if (sectorId.startsWith("default-")) {
    await seedDefaultDesignationSectors();
    const key = sectorId.replace("default-", "");
    const rows = await getDb()
      .select({ id: designationSectors.id })
      .from(designationSectors)
      .where(eq(designationSectors.key, key))
      .limit(1);
    if (!rows[0]) return { ok: false, error: "Sector no encontrado." };
    sectorId = rows[0].id;
  }
  await getDb().delete(designationSlots).where(eq(designationSlots.sectorId, sectorId));
  let order = 0;
  for (const label of parsed.data.slots) {
    await getDb().insert(designationSlots).values({
      id: randomUUID(),
      sectorId,
      label,
      sortOrder: order++,
    });
  }
  revalidate();
  return { ok: true };
}

export async function seedDefaultDesignationSectors() {
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo el owner puede activar los sectores predeterminados." };
  }
  const db = getDb();
  const existing = await db.select({ key: designationSectors.key }).from(designationSectors);
  const existingKeys = new Set(existing.map((row) => row.key));
  let order = await nextSectorOrder();
  let seeded = 0;
  for (const def of DESIGNATION_SECTORS_DEFAULTS) {
    if (existingKeys.has(def.key)) continue;
    const sectorId = randomUUID();
    await db.insert(designationSectors).values({
      id: sectorId,
      key: def.key,
      name: def.name,
      personFlag: def.personFlag,
      enabled: true,
      peopleCount: def.defaultPeopleCount,
      isDefault: true,
      sortOrder: order++,
    });
    let slotOrder = 0;
    for (const label of def.defaultSlots) {
      await db.insert(designationSlots).values({
        id: randomUUID(),
        sectorId,
        label,
        sortOrder: slotOrder++,
      });
    }
    seeded++;
  }
  revalidate();
  return { ok: true, seeded };
}

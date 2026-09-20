"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePrivilegedUser } from "@/features/auth/application/session";
import { outsideSpeakers } from "@/features/meetings/infrastructure/outside-speaker-schema";
import { getDb } from "@/shared/lib/db";

const speakerSchema = z.object({
  name: z.string().trim().min(1).max(160),
  congregation: z.string().trim().max(160).default(""),
  talkNumber: z.number().int().min(1).max(1000).nullable().default(null),
  talkTheme: z.string().trim().max(300).default(""),
  phone: z.string().trim().max(40).default(""),
  notes: z.string().trim().max(500).default(""),
});

const speakerId = z.string().min(1).max(64);

export async function createOutsideSpeaker(
  input: unknown,
): Promise<{ ok: boolean; error?: string }> {
  await requirePrivilegedUser();
  const parsed = speakerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados do orador inválidos." };
  await getDb()
    .insert(outsideSpeakers)
    .values({ id: randomUUID(), ...parsed.data });
  revalidatePath("/reunioes");
  return { ok: true };
}

export async function updateOutsideSpeaker(
  id: string,
  input: unknown,
): Promise<{ ok: boolean; error?: string }> {
  await requirePrivilegedUser();
  if (!speakerId.safeParse(id).success) return { ok: false, error: "Orador inválido." };
  const parsed = speakerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados do orador inválidos." };
  await getDb()
    .update(outsideSpeakers)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(outsideSpeakers.id, id));
  revalidatePath("/reunioes");
  return { ok: true };
}

export async function deleteOutsideSpeaker(id: string): Promise<{ ok: boolean; error?: string }> {
  await requirePrivilegedUser();
  if (!speakerId.safeParse(id).success) return { ok: false, error: "Orador inválido." };
  await getDb().delete(outsideSpeakers).where(eq(outsideSpeakers.id, id));
  revalidatePath("/reunioes");
  return { ok: true };
}

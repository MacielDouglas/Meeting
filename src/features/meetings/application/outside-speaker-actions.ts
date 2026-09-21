"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePrivilegedUser } from "@/features/auth/application/session";
import {
  ensureOutsideSpeakerTalksTable,
  outsideSpeakers,
  outsideSpeakerTalks,
} from "@/features/meetings/infrastructure/outside-speaker-schema";
import { getDb } from "@/shared/lib/db";

const talkSchema = z.object({
  talkNumber: z.number().int().min(1).max(1000),
  talkTheme: z.string().trim().max(300).default(""),
});

const speakerSchema = z.object({
  name: z.string().trim().min(1).max(160),
  congregation: z.string().trim().max(160).default(""),
  phone: z.string().trim().max(40).default(""),
  notes: z.string().trim().max(500).default(""),
  talks: z.array(talkSchema).max(20).default([]),
});

const speakerId = z.string().min(1).max(64);

function legacyTalkOf(input: { talks: { talkNumber: number; talkTheme: string }[] }): {
  talkNumber: number | null;
  talkTheme: string;
} {
  const first = input.talks[0];
  return { talkNumber: first?.talkNumber ?? null, talkTheme: first?.talkTheme ?? "" };
}

async function replaceTalks(
  speakerIdValue: string,
  talks: { talkNumber: number; talkTheme: string }[],
) {
  const db = getDb();
  await db.delete(outsideSpeakerTalks).where(eq(outsideSpeakerTalks.speakerId, speakerIdValue));
  for (const talk of talks) {
    await db.insert(outsideSpeakerTalks).values({
      id: randomUUID(),
      speakerId: speakerIdValue,
      talkNumber: talk.talkNumber,
      talkTheme: talk.talkTheme,
    });
  }
}

export async function createOutsideSpeaker(
  input: unknown,
): Promise<{ ok: boolean; error?: string }> {
  await requirePrivilegedUser();
  const parsed = speakerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos del orador inválidos." };
  await ensureOutsideSpeakerTalksTable();
  const id = randomUUID();
  const { talks, ...rest } = parsed.data;
  const legacy = legacyTalkOf(parsed.data);
  await getDb()
    .insert(outsideSpeakers)
    .values({ id, ...rest, ...legacy });
  await replaceTalks(id, talks);
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
  if (!parsed.success) return { ok: false, error: "Datos del orador inválidos." };
  await ensureOutsideSpeakerTalksTable();
  const { talks, ...rest } = parsed.data;
  const legacy = legacyTalkOf(parsed.data);
  await getDb()
    .update(outsideSpeakers)
    .set({ ...rest, ...legacy, updatedAt: new Date() })
    .where(eq(outsideSpeakers.id, id));
  await replaceTalks(id, talks);
  revalidatePath("/reunioes");
  return { ok: true };
}

export async function deleteOutsideSpeaker(id: string): Promise<{ ok: boolean; error?: string }> {
  await requirePrivilegedUser();
  if (!speakerId.safeParse(id).success) return { ok: false, error: "Orador inválido." };
  await ensureOutsideSpeakerTalksTable();
  const db = getDb();
  await db.delete(outsideSpeakerTalks).where(eq(outsideSpeakerTalks.speakerId, id));
  await db.delete(outsideSpeakers).where(eq(outsideSpeakers.id, id));
  revalidatePath("/reunioes");
  return { ok: true };
}

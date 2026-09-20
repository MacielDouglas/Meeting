"use server";

import { asc } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/features/auth/application/session";
import { outsideSpeakers } from "@/features/meetings/infrastructure/outside-speaker-schema";
import { getDb } from "@/shared/lib/db";

export interface OutsideSpeakerItem {
  id: string;
  name: string;
  congregation: string;
  talkNumber: number | null;
  talkTheme: string;
  phone: string;
  notes: string;
}

export async function listOutsideSpeakers(): Promise<OutsideSpeakerItem[]> {
  await requireAuthenticatedUser();
  const rows = await getDb()
    .select({
      id: outsideSpeakers.id,
      name: outsideSpeakers.name,
      congregation: outsideSpeakers.congregation,
      talkNumber: outsideSpeakers.talkNumber,
      talkTheme: outsideSpeakers.talkTheme,
      phone: outsideSpeakers.phone,
      notes: outsideSpeakers.notes,
    })
    .from(outsideSpeakers)
    .orderBy(asc(outsideSpeakers.name));
  return rows.map((row) => ({
    ...row,
    congregation: row.congregation ?? "",
    talkTheme: row.talkTheme ?? "",
    phone: row.phone ?? "",
    notes: row.notes ?? "",
  }));
}

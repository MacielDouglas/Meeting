"use server";

import { asc } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/features/auth/application/session";
import {
  ensureOutsideSpeakerTalksTable,
  outsideSpeakers,
  outsideSpeakerTalks,
} from "@/features/meetings/infrastructure/outside-speaker-schema";
import { getDb } from "@/shared/lib/db";

export interface OutsideSpeakerTalk {
  id: string;
  talkNumber: number;
  talkTheme: string;
}

export interface OutsideSpeakerItem {
  id: string;
  name: string;
  congregation: string;
  talkNumber: number | null;
  talkTheme: string;
  phone: string;
  notes: string;
  talks: OutsideSpeakerTalk[];
}

export async function listOutsideSpeakers(): Promise<OutsideSpeakerItem[]> {
  await requireAuthenticatedUser();
  await ensureOutsideSpeakerTalksTable();
  const db = getDb();
  const rows = await db
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
  const talkRows = await db
    .select({
      id: outsideSpeakerTalks.id,
      speakerId: outsideSpeakerTalks.speakerId,
      talkNumber: outsideSpeakerTalks.talkNumber,
      talkTheme: outsideSpeakerTalks.talkTheme,
    })
    .from(outsideSpeakerTalks)
    .orderBy(asc(outsideSpeakerTalks.talkNumber));
  const bySpeaker = new Map<string, OutsideSpeakerTalk[]>();
  for (const talk of talkRows) {
    const list = bySpeaker.get(talk.speakerId) ?? [];
    list.push({ id: talk.id, talkNumber: talk.talkNumber, talkTheme: talk.talkTheme ?? "" });
    bySpeaker.set(talk.speakerId, list);
  }
  return rows.map((row) => {
    const talks = bySpeaker.get(row.id) ?? [];
    // Compatibilidade: discursos ainda só nas colunas legadas.
    if (talks.length === 0 && row.talkNumber !== null) {
      talks.push({ id: "legacy", talkNumber: row.talkNumber, talkTheme: row.talkTheme ?? "" });
    }
    return {
      ...row,
      congregation: row.congregation ?? "",
      talkTheme: row.talkTheme ?? "",
      phone: row.phone ?? "",
      notes: row.notes ?? "",
      talks,
    };
  });
}

/** Busca de oradores por número, nome ou congregação (designação de fim de semana). */
export async function searchOutsideSpeakers(query: string): Promise<OutsideSpeakerItem[]> {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) return [];
  const numeric = /^\d+$/.test(normalized) ? Number(normalized) : null;
  const speakers = await listOutsideSpeakers();
  return speakers
    .filter((speaker) => {
      if (numeric !== null && speaker.talks.some((talk) => talk.talkNumber === numeric)) {
        return true;
      }
      if (speaker.name.toLowerCase().includes(normalized)) return true;
      if (speaker.congregation.toLowerCase().includes(normalized)) return true;
      return speaker.talks.some((talk) => talk.talkTheme.toLowerCase().includes(normalized));
    })
    .slice(0, 20);
}

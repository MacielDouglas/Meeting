import { asc } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/features/auth/application/session";
import type { ContentLanguage } from "@/features/meeting-content/infrastructure/meeting-content-schema";
import {
  songs,
  talkOutlines,
} from "@/features/meeting-content/infrastructure/meeting-content-schema";
import { getDb } from "@/shared/lib/db";

export interface SongItem {
  id: string;
  number: number;
  theme: string;
  language: ContentLanguage;
}

export interface OutlineItem {
  id: string;
  number: number;
  theme: string;
  language: ContentLanguage;
}

export async function listSongs(language?: ContentLanguage): Promise<SongItem[]> {
  await requireAuthenticatedUser();
  try {
    const rows = await getDb().select().from(songs).orderBy(asc(songs.number));
    return rows
      .filter((row) => !language || row.language === language)
      .map((row) => ({
        id: row.id,
        number: row.number,
        theme: row.theme,
        language: row.language as ContentLanguage,
      }));
  } catch {
    return [];
  }
}

export async function listOutlines(language?: ContentLanguage): Promise<OutlineItem[]> {
  await requireAuthenticatedUser();
  try {
    const rows = await getDb().select().from(talkOutlines).orderBy(asc(talkOutlines.number));
    return rows
      .filter((row) => !language || row.language === language)
      .map((row) => ({
        id: row.id,
        number: row.number,
        theme: row.theme,
        language: row.language as ContentLanguage,
      }));
  } catch {
    return [];
  }
}

export interface ContentCounts {
  songsEs: number;
  songsPt: number;
  songsEn: number;
  outlinesEs: number;
  outlinesPt: number;
  outlinesEn: number;
}

export async function getContentCounts(): Promise<ContentCounts> {
  await requireAuthenticatedUser();
  const zero: ContentCounts = {
    songsEs: 0,
    songsPt: 0,
    songsEn: 0,
    outlinesEs: 0,
    outlinesPt: 0,
    outlinesEn: 0,
  };
  try {
    const db = getDb();
    const [songRows, outlineRows] = await Promise.all([
      db.select({ language: songs.language }).from(songs),
      db.select({ language: talkOutlines.language }).from(talkOutlines),
    ]);
    for (const row of songRows) {
      if (row.language === "es") zero.songsEs++;
      else if (row.language === "pt") zero.songsPt++;
      else zero.songsEn++;
    }
    for (const row of outlineRows) {
      if (row.language === "es") zero.outlinesEs++;
      else if (row.language === "pt") zero.outlinesPt++;
      else zero.outlinesEn++;
    }
    return zero;
  } catch {
    return zero;
  }
}

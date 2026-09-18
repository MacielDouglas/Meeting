import { requireAuthenticatedUser } from "@/features/auth/application/session";
import type { ContentLanguage } from "@/features/meeting-content/infrastructure/meeting-content-schema";
import {
  meetingWorkbooks,
  songs,
} from "@/features/meeting-content/infrastructure/meeting-content-schema";
import type { WorkbookContentWeek } from "@/features/meeting-content/infrastructure/workbook-parser";
import { getDb } from "@/shared/lib/db";

export interface WorkbookIssueItem {
  id: string;
  symbol: string;
  name: string;
  language: ContentLanguage;
  source: string | null;
  weeks: WorkbookContentWeek[];
}

export async function listWorkbookIssues(): Promise<WorkbookIssueItem[]> {
  await requireAuthenticatedUser();
  try {
    const db = getDb();
    const [rows, songRows] = await Promise.all([
      db.select().from(meetingWorkbooks),
      db.select().from(songs),
    ]);
    const themeByLangAndNumber = new Map(
      songRows.map((row) => [`${row.language}:${row.number}`, row.theme]),
    );
    const themeFor = (language: ContentLanguage, number: number | null): string | null =>
      number != null ? (themeByLangAndNumber.get(`${language}:${number}`) ?? null) : null;

    const ordered = [...rows].sort((a, b) => (a.symbol < b.symbol ? 1 : -1));

    return ordered.map((row) => {
      const content = JSON.parse(row.content) as { name?: string; weeks?: WorkbookContentWeek[] };
      const weeks: WorkbookContentWeek[] = (content.weeks ?? []).map((week) => ({
        week: week.week,
        meeting: {
          ...week.meeting,
          song: week.meeting.song?.map((s) => ({
            openingSong: s.openingSong,
            middleSong: s.middleSong,
            closingSong: s.closingSong,
            duration: s.duration,
            ...(s.openingSong &&
            themeFor(row.language as ContentLanguage, extractSongNumber(s.openingSong))
              ? {
                  openingSongTheme: themeFor(
                    row.language as ContentLanguage,
                    extractSongNumber(s.openingSong),
                  ),
                }
              : {}),
            ...(s.middleSong &&
            themeFor(row.language as ContentLanguage, extractSongNumber(s.middleSong))
              ? {
                  middleSongTheme: themeFor(
                    row.language as ContentLanguage,
                    extractSongNumber(s.middleSong),
                  ),
                }
              : {}),
            ...(s.closingSong &&
            themeFor(row.language as ContentLanguage, extractSongNumber(s.closingSong))
              ? {
                  closingSongTheme: themeFor(
                    row.language as ContentLanguage,
                    extractSongNumber(s.closingSong),
                  ),
                }
              : {}),
          })),
        },
      }));
      return {
        id: row.id,
        symbol: row.symbol,
        name: row.name,
        language: row.language as ContentLanguage,
        source: row.source,
        weeks,
      };
    });
  } catch {
    return [];
  }
}

function extractSongNumber(songText: string | undefined): number | null {
  if (!songText) return null;
  const match = songText.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

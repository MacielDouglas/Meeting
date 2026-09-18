import { asc, eq } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/features/auth/application/session";
import type { ContentLanguage } from "@/features/meeting-content/infrastructure/meeting-content-schema";
import {
  songs,
  watchtowerArticles,
  watchtowerIssues,
} from "@/features/meeting-content/infrastructure/meeting-content-schema";
import { getDb } from "@/shared/lib/db";

export interface WatchtowerArticleItem {
  id: string;
  weekStart: string | null;
  weekEnd: string | null;
  weekLabel: string;
  title: string;
  openingSong: number | null;
  openingSongTheme: string | null;
  closingSong: number | null;
  closingSongTheme: string | null;
}

export interface WatchtowerIssueItem {
  id: string;
  symbol: string;
  name: string;
  language: ContentLanguage;
  articles: WatchtowerArticleItem[];
}

export async function listWatchtowerIssues(): Promise<WatchtowerIssueItem[]> {
  await requireAuthenticatedUser();
  try {
    const db = getDb();
    const [issueRows, articleRows, songRows] = await Promise.all([
      db.select().from(watchtowerIssues),
      db.select().from(watchtowerArticles).orderBy(asc(watchtowerArticles.sortOrder)),
      db.select().from(songs),
    ]);
    // Edições mais recentes primeiro (símbolo decrescente: w26.07-S antes de w26.06-S).
    const orderedIssues = [...issueRows].sort((a, b) => (a.symbol < b.symbol ? 1 : -1));
    const themeByLangAndNumber = new Map(
      songRows.map((row) => [`${row.language}:${row.number}`, row.theme]),
    );
    // Ordem decrescente por semana (mais recente primeiro).
    const orderedArticles = [...articleRows].sort((a, b) => {
      if (a.weekStart && b.weekStart && a.weekStart !== b.weekStart) {
        return a.weekStart < b.weekStart ? 1 : -1;
      }
      if (a.weekStart && !b.weekStart) return -1;
      if (!a.weekStart && b.weekStart) return 1;
      return b.sortOrder - a.sortOrder;
    });
    const articlesByIssue = new Map<string, WatchtowerArticleItem[]>();
    for (const article of orderedArticles) {
      const issue = issueRows.find((row) => row.id === article.issueId);
      const language = (issue?.language ?? "es") as ContentLanguage;
      const list = articlesByIssue.get(article.issueId) ?? [];
      list.push({
        id: article.id,
        weekStart: article.weekStart,
        weekEnd: article.weekEnd,
        weekLabel: article.weekLabel,
        title: article.title,
        openingSong: article.openingSong,
        openingSongTheme:
          article.openingSong != null
            ? (themeByLangAndNumber.get(`${language}:${article.openingSong}`) ?? null)
            : null,
        closingSong: article.closingSong,
        closingSongTheme:
          article.closingSong != null
            ? (themeByLangAndNumber.get(`${language}:${article.closingSong}`) ?? null)
            : null,
      });
      articlesByIssue.set(article.issueId, list);
    }
    return orderedIssues.map((issue) => ({
      id: issue.id,
      symbol: issue.symbol,
      name: issue.name,
      language: issue.language as ContentLanguage,
      articles: articlesByIssue.get(issue.id) ?? [],
    }));
  } catch {
    return [];
  }
}

export async function countWatchtowerIssue(symbol: string): Promise<number> {
  await requireAuthenticatedUser();
  try {
    const rows = await getDb()
      .select({ id: watchtowerIssues.id })
      .from(watchtowerIssues)
      .where(eq(watchtowerIssues.symbol, symbol));
    return rows.length;
  } catch {
    return 0;
  }
}

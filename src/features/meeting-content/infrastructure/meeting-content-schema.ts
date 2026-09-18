import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Idioma do conteúdo: S = espanhol, T = português, E = inglês.
export const contentLanguageEnum = pgEnum("content_language", ["es", "pt", "en"]);

export const songs = pgTable("songs", {
  id: text("id").primaryKey(),
  number: integer("number").notNull(),
  theme: text("theme").notNull(),
  language: contentLanguageEnum("language").notNull().default("es"),
  source: text("source"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const talkOutlines = pgTable("talk_outlines", {
  id: text("id").primaryKey(),
  number: integer("number").notNull(),
  theme: text("theme").notNull(),
  language: contentLanguageEnum("language").notNull().default("es"),
  source: text("source"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SongRow = typeof songs.$inferSelect;
export type TalkOutlineRow = typeof talkOutlines.$inferSelect;
export type ContentLanguage = (typeof contentLanguageEnum.enumValues)[number];

// Edição de estudo de A Sentinela (ex: símbolo w26.06-S).
export const watchtowerIssues = pgTable("watchtower_issues", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  language: contentLanguageEnum("language").notNull().default("es"),
  year: integer("year"),
  issueNumber: integer("issue_number"),
  source: text("source"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const watchtowerArticles = pgTable("watchtower_articles", {
  id: text("id").primaryKey(),
  issueId: text("issue_id")
    .notNull()
    .references(() => watchtowerIssues.id, { onDelete: "cascade" }),
  weekStart: text("week_start"),
  weekEnd: text("week_end"),
  weekLabel: text("week_label").notNull(),
  title: text("title").notNull(),
  openingSong: integer("opening_song"),
  closingSong: integer("closing_song"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type WatchtowerIssueRow = typeof watchtowerIssues.$inferSelect;
export type WatchtowerArticleRow = typeof watchtowerArticles.$inferSelect;

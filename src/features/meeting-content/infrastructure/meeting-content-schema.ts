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

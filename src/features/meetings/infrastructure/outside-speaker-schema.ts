import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { getDb } from "@/shared/lib/db";

/**
 * Oradores de fora (discursos públicos de saída/entrada, espelho do
 * WE-OutgoingSchedule/Slips do TheocBase).
 */
export const outsideSpeakers = pgTable("outside_speakers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  congregation: text("congregation").notNull().default(""),
  talkNumber: integer("talk_number"),
  talkTheme: text("talk_theme").notNull().default(""),
  phone: text("phone").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type OutsideSpeakerRow = typeof outsideSpeakers.$inferSelect;
export type NewOutsideSpeakerRow = typeof outsideSpeakers.$inferInsert;

/**
 * Discursos de cada orador (um orador pode ter vários). Criada em tempo de
 * execução quando ausente, para não exigir migração manual.
 */
export const outsideSpeakerTalks = pgTable("outside_speaker_talks", {
  id: text("id").primaryKey(),
  speakerId: text("speaker_id").notNull(),
  talkNumber: integer("talk_number").notNull(),
  talkTheme: text("talk_theme").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type OutsideSpeakerTalkRow = typeof outsideSpeakerTalks.$inferSelect;

export async function ensureOutsideSpeakerTalksTable(): Promise<void> {
  await getDb().execute(sql`
    CREATE TABLE IF NOT EXISTS outside_speaker_talks (
      id text PRIMARY KEY,
      speaker_id text NOT NULL REFERENCES outside_speakers(id) ON DELETE CASCADE,
      talk_number integer NOT NULL,
      talk_theme text NOT NULL DEFAULT '',
      created_at timestamp NOT NULL DEFAULT NOW()
    )
  `);
}

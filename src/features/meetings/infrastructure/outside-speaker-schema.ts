import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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

import { boolean, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "@/features/auth/infrastructure/user-schema";

export const personSexEnum = pgEnum("person_sex", ["male", "female"]);

export const persons = pgTable("persons", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  sex: personSexEnum("sex").notNull(),
  familyHead: boolean("family_head").notNull().default(false),
  familyMemberId: text("family_member_id"),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "set null" })
    .unique(),
  cleaning: boolean("cleaning").notNull().default(true),
  young: boolean("young").notNull().default(false),
  helper: boolean("helper").notNull().default(true),
  startConversations: boolean("start_conversations").notNull().default(true),
  returnVisits: boolean("return_visits").notNull().default(true),
  makeDisciples: boolean("make_disciples").notNull().default(true),
  explainBeliefs: boolean("explain_beliefs").notNull().default(true),
  betterSpeech: boolean("better_speech").notNull().default(false),
  bibleReading: boolean("bible_reading").notNull().default(false),
  baptized: boolean("baptized").notNull().default(false),
  prayer: boolean("prayer").notNull().default(false),
  sound: boolean("sound").notNull().default(false),
  video: boolean("video").notNull().default(false),
  platform: boolean("platform").notNull().default(false),
  microphone: boolean("microphone").notNull().default(false),
  elder: boolean("elder").notNull().default(false),
  ministerialServant: boolean("ministerial_servant").notNull().default(false),
  midweekChairman: boolean("midweek_chairman").notNull().default(false),
  treasuresTalk: boolean("treasures_talk").notNull().default(false),
  pearlsQuest: boolean("pearls_quest").notNull().default(false),
  audienceAnalysis: boolean("audience_analysis").notNull().default(false),
  analysisTalk: boolean("analysis_talk").notNull().default(false),
  bibleStudy: boolean("bible_study").notNull().default(false),
  studyReader: boolean("study_reader").notNull().default(false),
  publicChairman: boolean("public_chairman").notNull().default(false),
  publicTalk: boolean("public_talk").notNull().default(false),
  watchtowerConductor: boolean("watchtower_conductor").notNull().default(false),
  watchtowerReader: boolean("watchtower_reader").notNull().default(false),
  usher: boolean("usher").notNull().default(false),
  unavailable: boolean("unavailable").notNull().default(false),
  unavailableNotes: text("unavailable_notes").notNull().default(""),
  lastAssignmentAt: timestamp("last_assignment_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PersonRow = typeof persons.$inferSelect;
export type NewPersonRow = typeof persons.$inferInsert;
export type PersonSex = (typeof personSexEnum.enumValues)[number];

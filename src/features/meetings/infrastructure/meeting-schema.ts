import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "@/features/auth/infrastructure/user-schema";

export const meetingKindEnum = pgEnum("meeting_kind", ["midweek", "weekend"]);
export const meetingProgramStatusEnum = pgEnum("meeting_program_status", ["draft", "confirmed"]);

export const meetingPrograms = pgTable("meeting_programs", {
  id: text("id").primaryKey(),
  kind: meetingKindEnum("kind").notNull(),
  weekStart: text("week_start").notNull(),
  date: text("date").notNull(),
  outlineId: text("outline_id"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  status: meetingProgramStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const meetingAssignments = pgTable("meeting_assignments", {
  id: text("id").primaryKey(),
  programId: text("program_id")
    .notNull()
    .references(() => meetingPrograms.id, { onDelete: "cascade" }),
  partKey: text("part_key").notNull(),
  section: text("section").notNull().default(""),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  startTime: text("start_time").notNull().default(""),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  personId: text("person_id"),
  personName: text("person_name").notNull().default(""),
  helperPersonId: text("helper_person_id"),
  helperPersonName: text("helper_person_name").notNull().default(""),
  songNumber: integer("song_number"),
  songTheme: text("song_theme").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type MeetingProgramRow = typeof meetingPrograms.$inferSelect;
export type MeetingAssignmentRow = typeof meetingAssignments.$inferSelect;
export type MeetingKind = (typeof meetingKindEnum.enumValues)[number];

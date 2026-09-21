import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const SETTINGS_ID = "global";

export const meetingSettings = pgTable("meeting_settings", {
  id: text("id").primaryKey(),
  congregationName: text("congregation_name").notNull().default(""),
  midweekDay: integer("midweek_day").notNull().default(2),
  midweekTime: text("midweek_time").notNull().default("19:30"),
  weekendDay: integer("weekend_day").notNull().default(0),
  weekendTime: text("weekend_time").notNull().default("10:00"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const specialEventTypeEnum = pgEnum("special_event_type", [
  "regional_assembly",
  "circuit_assembly",
  "representative_assembly",
  "memorial",
  "circuit_visit",
  "special_talk",
  "other",
]);

export const specialEvents = pgTable("special_events", {
  id: text("id").primaryKey(),
  type: specialEventTypeEnum("type").notNull(),
  title: text("title").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  startTime: text("start_time").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const scheduleExceptionTypeEnum = pgEnum("schedule_exception_type", [
  "no_meeting",
  "modified_time",
  "special_meeting",
]);

export const scheduleExceptions = pgTable("schedule_exceptions", {
  id: text("id").primaryKey(),
  type: scheduleExceptionTypeEnum("type").notNull(),
  date: text("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type MeetingSettingsRow = typeof meetingSettings.$inferSelect;
export type SpecialEventRow = typeof specialEvents.$inferSelect;
export type ScheduleExceptionRow = typeof scheduleExceptions.$inferSelect;

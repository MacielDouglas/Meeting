import { boolean, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "@/features/auth/infrastructure/user-schema";
import { persons } from "@/features/people/infrastructure/person-schema";

export const dutyProgramStatusEnum = pgEnum("duty_program_status", [
  "draft",
  "confirmed",
  "archived",
]);

/** Escala de apoio da reunião (acomodador, som, vídeo, microfone, plataforma). */
export const dutyPrograms = pgTable("duty_programs", {
  id: text("id").primaryKey(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: dutyProgramStatusEnum("status").notNull().default("draft"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dutyAssignments = pgTable("duty_assignments", {
  id: text("id").primaryKey(),
  programId: text("program_id")
    .notNull()
    .references(() => dutyPrograms.id, { onDelete: "cascade" }),
  assignmentDate: text("assignment_date").notNull(),
  meetingKind: text("meeting_kind").notNull(),
  dutyKey: text("duty_key").notNull(),
  postLabel: text("post_label").notNull().default(""),
  side: text("side"),
  personId: text("person_id").references(() => persons.id, { onDelete: "set null" }),
  personName: text("person_name").notNull().default(""),
  isManual: boolean("is_manual").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DutyProgramRow = typeof dutyPrograms.$inferSelect;
export type DutyAssignmentRow = typeof dutyAssignments.$inferSelect;

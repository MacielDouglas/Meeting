import { boolean, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "@/features/auth/infrastructure/user-schema";
import {
  cleaningTypeKeyEnum,
  cleaningTypes,
} from "@/features/cleaning/infrastructure/cleaning-schema";
import { persons } from "@/features/people/infrastructure/person-schema";

export const cleaningProgramStatusEnum = pgEnum("cleaning_program_status", [
  "draft",
  "confirmed",
  "archived",
]);

export const cleaningPrograms = pgTable("cleaning_programs", {
  id: text("id").primaryKey(),
  typeKey: cleaningTypeKeyEnum("type_key")
    .notNull()
    .references(() => cleaningTypes.key),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: cleaningProgramStatusEnum("status").notNull().default("draft"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cleaningAssignments = pgTable("cleaning_assignments", {
  id: text("id").primaryKey(),
  programId: text("program_id")
    .notNull()
    .references(() => cleaningPrograms.id, { onDelete: "cascade" }),
  assignmentDate: text("assignment_date").notNull(),
  sectorKey: text("sector_key").notNull(),
  sectorName: text("sector_name").notNull(),
  personId: text("person_id").references(() => persons.id, { onDelete: "set null" }),
  personName: text("person_name").notNull().default(""),
  isFamily: boolean("is_family").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CleaningProgramRow = typeof cleaningPrograms.$inferSelect;
export type CleaningAssignmentRow = typeof cleaningAssignments.$inferSelect;

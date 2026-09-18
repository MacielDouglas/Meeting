import { boolean, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const cleaningTypeKeyEnum = pgEnum("cleaning_type_key", [
  "per_meeting",
  "weekly",
  "general",
]);

export const cleaningAssignmentModeEnum = pgEnum("cleaning_assignment_mode", [
  "person",
  "family",
  "group",
]);

export const requiredSexEnum = pgEnum("required_sex", ["any", "male", "female"]);

export const cleaningTypes = pgTable("cleaning_types", {
  id: text("id").primaryKey(),
  key: cleaningTypeKeyEnum("key").notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  assignmentMode: cleaningAssignmentModeEnum("assignment_mode").notNull().default("person"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cleaningSectors = pgTable("cleaning_sectors", {
  id: text("id").primaryKey(),
  cleaningTypeKey: cleaningTypeKeyEnum("cleaning_type_key").notNull(),
  key: text("key"),
  name: text("name").notNull(),
  task: text("task").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  peopleCount: integer("people_count"),
  requiredSex: requiredSexEnum("required_sex").notNull().default("any"),
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CleaningTypeRow = typeof cleaningTypes.$inferSelect;
export type CleaningSectorRow = typeof cleaningSectors.$inferSelect;

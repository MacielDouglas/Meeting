import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const designationSectors = pgTable("designation_sectors", {
  id: text("id").primaryKey(),
  key: text("key"),
  name: text("name").notNull(),
  // habilidade correspondente em persons (usher, sound, video, microphone, platform) ou null p/ personalizado
  personFlag: text("person_flag"),
  enabled: boolean("enabled").notNull().default(true),
  peopleCount: integer("people_count"),
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const designationSlots = pgTable("designation_slots", {
  id: text("id").primaryKey(),
  sectorId: text("sector_id")
    .notNull()
    .references(() => designationSectors.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DesignationSectorRow = typeof designationSectors.$inferSelect;
export type DesignationSlotRow = typeof designationSlots.$inferSelect;

import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "@/features/auth/infrastructure/organization-schema";
import { users } from "@/features/auth/infrastructure/user-schema";

/**
 * Enlace público da semana: um ativo por organização. Guarda só o hash
 * SHA-256 do token — o token em claro aparece uma única vez, na criação.
 * Sem validade: vale até o owner revogar (linha apagada → rota vira 404).
 */
export const publicShares = pgTable("public_share", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PublicShareRow = typeof publicShares.$inferSelect;

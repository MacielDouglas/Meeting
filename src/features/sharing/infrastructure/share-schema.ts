import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "@/features/auth/infrastructure/organization-schema";
import { users } from "@/features/auth/infrastructure/user-schema";

/**
 * Enlace público da semana: um ativo por organização. Guarda só o hash
 * SHA-256 do token — o token em claro aparece uma única vez, na criação.
 * Validade de 90 dias (`expires_at`; NULL = legado anterior ao TTL, tratado
 * como válido até rotação). Expirado ou revogado (linha apagada) → rota 404.
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
  expiresAt: timestamp("expires_at"),
});

export type PublicShareRow = typeof publicShares.$inferSelect;

import { eq } from "drizzle-orm";
import { requireOwnerUser } from "@/features/auth/application/session";
import { publicShares } from "@/features/sharing/infrastructure/share-schema";
import { getDb } from "@/shared/lib/db";

export interface PublicShareStatus {
  active: boolean;
  createdAt: string | null;
  /** ISO da expiração (90 dias); null = legado anterior ao TTL. */
  expiresAt: string | null;
}

function toISO(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

/** Erro de coluna ainda não migrada (banco legado sem `expires_at`). */
function isMissingExpiresColumn(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /expires_at|no such column/i.test(message);
}

/** Estado do enlace público (só owner; nunca expõe o token). */
export async function getPublicShareStatus(): Promise<PublicShareStatus> {
  await requireOwnerUser();
  const inactive = { active: false, createdAt: null, expiresAt: null };
  try {
    const rows = await getDb()
      .select({ createdAt: publicShares.createdAt, expiresAt: publicShares.expiresAt })
      .from(publicShares)
      .limit(1);
    const row = rows[0];
    if (!row) return inactive;
    return {
      active: true,
      createdAt: toISO(row.createdAt),
      expiresAt: row.expiresAt ? toISO(row.expiresAt) : null,
    };
  } catch (error) {
    if (isMissingExpiresColumn(error)) {
      // Banco legado: lê sem a coluna nova em vez de fingir inativo.
      try {
        const rows = await getDb()
          .select({ createdAt: publicShares.createdAt })
          .from(publicShares)
          .limit(1);
        const row = rows[0];
        if (!row) return inactive;
        return { active: true, createdAt: toISO(row.createdAt), expiresAt: null };
      } catch {
        return inactive;
      }
    }
    // Tabela ainda não migrada: trata como inativo em vez de quebrar o admin.
    return inactive;
  }
}

/**
 * Hash → organização dona do enlace válido (uso interno da rota pública, sem
 * sessão). Expirado → null (mesmo 404 de token desconhecido). NULL (legado)
 * conta como válido até rotação.
 */
export async function findValidShareOrganizationIdByHash(
  tokenHash: string,
): Promise<string | null> {
  let rows: { organizationId: string; expiresAt: Date | string | null }[];
  try {
    rows = await getDb()
      .select({ organizationId: publicShares.organizationId, expiresAt: publicShares.expiresAt })
      .from(publicShares)
      .where(eq(publicShares.tokenHash, tokenHash))
      .limit(1);
  } catch (error) {
    if (!isMissingExpiresColumn(error)) throw error;
    const legacy = await getDb()
      .select({ organizationId: publicShares.organizationId })
      .from(publicShares)
      .where(eq(publicShares.tokenHash, tokenHash))
      .limit(1);
    return legacy[0]?.organizationId ?? null;
  }
  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt && new Date(row.expiresAt) <= new Date()) return null;
  return row.organizationId;
}

import { eq } from "drizzle-orm";
import { requireOwnerUser } from "@/features/auth/application/session";
import { publicShares } from "@/features/sharing/infrastructure/share-schema";
import { getDb } from "@/shared/lib/db";

export interface PublicShareStatus {
  active: boolean;
  createdAt: string | null;
}

function toISO(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

/** Estado do enlace público (só owner; nunca expõe o token). */
export async function getPublicShareStatus(): Promise<PublicShareStatus> {
  await requireOwnerUser();
  let rows: { createdAt: Date }[];
  try {
    rows = await getDb().select({ createdAt: publicShares.createdAt }).from(publicShares).limit(1);
  } catch {
    // Tabela ainda não migrada: trata como inativo em vez de quebrar o admin.
    return { active: false, createdAt: null };
  }
  const row = rows[0];
  if (!row) return { active: false, createdAt: null };
  return { active: true, createdAt: toISO(row.createdAt) };
}

/** Hash → organização dona do enlace (uso interno da rota pública, sem sessão). */
export async function findShareOrganizationIdByHash(tokenHash: string): Promise<string | null> {
  const rows = await getDb()
    .select({ organizationId: publicShares.organizationId })
    .from(publicShares)
    .where(eq(publicShares.tokenHash, tokenHash))
    .limit(1);
  return rows[0]?.organizationId ?? null;
}

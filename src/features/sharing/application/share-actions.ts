"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOwnerUser } from "@/features/auth/application/session";
import { organizations } from "@/features/auth/infrastructure/organization-schema";
import { meetingSettings } from "@/features/settings/infrastructure/settings-schema";
import { generateShareToken, hashShareToken } from "@/features/sharing/domain/share-token";
import { publicShares } from "@/features/sharing/infrastructure/share-schema";
import { getDb } from "@/shared/lib/db";

export interface ShareActionResult {
  ok: boolean;
  error?: string;
  /** Token em claro: exibido uma única vez, nunca persistido. */
  token?: string;
  url?: string;
  /** ISO da expiração (90 dias a partir da criação). */
  expiresAt?: string;
}

const CONGREGATION_ORG_SLUG = "congregation";

/** Validade do enlace público: 90 dias (rotação gera um novo). */
const PUBLIC_SHARE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const SHARE_TABLES_MISSING_ERROR =
  "Tabla de enlaces no creada en la base de datos. Ejecuta `npm run db:push` y recarga la página.";

function sqlStateCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function errorText(error: unknown): string {
  const direct = error instanceof Error ? error.message : String(error);
  if (typeof error === "object" && error !== null) {
    const cause = (error as { cause?: unknown }).cause;
    if (cause instanceof Error) return `${direct} ${cause.message}`;
  }
  return direct;
}

/**
 * Violação de unicidade (colisão de hash do token): gera outro token e tenta
 * de novo. O driver Neon expõe o SQLSTATE em `code` (`23505`); a mensagem
 * (contém "unique"/"duplicate key") cobre outros formatos.
 */
function isUniqueViolationError(error: unknown): boolean {
  if (sqlStateCode(error) === "23505") return true;
  const message = errorText(error);
  return message.includes("unique") || message.includes("duplicate key");
}

function isMissingTableError(error: unknown): boolean {
  // SQLSTATE do Postgres (o driver Neon expõe em `code`): 42P01 = tabela
  // ausente, 42703 = coluna ausente (ex.: `expires_at` sem a migração 0018).
  // Sem o código, casa pela mensagem de relação/coluna inexistente.
  if (sqlStateCode(error) === "42P01" || sqlStateCode(error) === "42703") return true;
  const message = errorText(error);
  return (
    /relation "[^"]*" does not exist/i.test(message) ||
    /column "[^"]*".*does not exist/i.test(message) ||
    /no such (table|column)/i.test(message) ||
    message.includes("expires_at")
  );
}

function publicShareUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return `${base}/api/public/programa/${token}`;
}

/**
 * Organização da congregação (app de congregação única). Cria na primeira
 * vez, como nos fluxos de convite — o enlace é um por organização.
 */
async function ensureShareOrganization(): Promise<string> {
  const db = getDb();
  const rows = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, CONGREGATION_ORG_SLUG))
    .limit(1);
  if (rows[0]) return rows[0].id;
  const settings = await db
    .select({ congregationName: meetingSettings.congregationName })
    .from(meetingSettings)
    .limit(1);
  const name = settings[0]?.congregationName.trim() || "Congregación";
  const id = randomUUID();
  await db.insert(organizations).values({ id, name, slug: CONGREGATION_ORG_SLUG });
  return id;
}

/**
 * Cria (ou substitui) o token do enlace público. Só um ativo por vez:
 * gerar um novo invalida o anterior. Vale 90 dias; expirado → rota 404.
 */
export async function createPublicShareToken(): Promise<ShareActionResult> {
  let ownerId: string;
  try {
    ownerId = (await requireOwnerUser()).id;
  } catch {
    return { ok: false, error: "Solo el owner puede generar el enlace." };
  }
  let organizationId: string;
  try {
    organizationId = await ensureShareOrganization();
  } catch (error) {
    console.error("[share] falha ao preparar organização do enlace", error);
    return { ok: false, error: "No se pudo preparar la organización." };
  }
  try {
    const db = getDb();
    for (let attempt = 0; attempt < 5; attempt++) {
      const token = generateShareToken();
      const expiresAt = new Date(Date.now() + PUBLIC_SHARE_TTL_MS);
      try {
        await db.delete(publicShares).where(eq(publicShares.organizationId, organizationId));
        await db.insert(publicShares).values({
          id: randomUUID(),
          organizationId,
          tokenHash: hashShareToken(token),
          createdBy: ownerId,
          expiresAt,
        });
      } catch (error) {
        // Colisão de hash (quase impossível): tenta outro token. Tabela ou
        // coluna ausente: orienta a migrar. Qualquer outra falha cai no catch
        // externo: loga e devolve erro amigável em vez de 500.
        if (isUniqueViolationError(error)) continue;
        if (isMissingTableError(error)) return { ok: false, error: SHARE_TABLES_MISSING_ERROR };
        throw error;
      }
      try {
        revalidatePath("/administracion");
      } catch (error) {
        // O enlace já foi criado; o cache se resolve no próximo acesso.
        console.error("[share] falha ao revalidar /administracion após criar enlace", error);
      }
      return { ok: true, token, url: publicShareUrl(token), expiresAt: expiresAt.toISOString() };
    }
  } catch (error) {
    console.error("[share] falha ao criar enlace público", error);
    return { ok: false, error: "No se pudo generar el enlace. Inténtalo de nuevo." };
  }
  return { ok: false, error: "No se pudo generar el enlace. Inténtalo de nuevo." };
}

/** Revoga o enlace: apaga a linha — a rota passa a responder 404. */
export async function revokePublicShareToken(): Promise<ShareActionResult> {
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo el owner puede revocar el enlace." };
  }
  try {
    const db = getDb();
    const organizationId = await ensureShareOrganization();
    await db.delete(publicShares).where(eq(publicShares.organizationId, organizationId));
  } catch (error) {
    if (isMissingTableError(error)) return { ok: false, error: SHARE_TABLES_MISSING_ERROR };
    console.error("[share] falha ao revogar enlace público", error);
    return { ok: false, error: "No se pudo revocar el enlace." };
  }
  try {
    revalidatePath("/administracion");
  } catch (error) {
    console.error("[share] falha ao revalidar /administracion após revogar enlace", error);
  }
  return { ok: true };
}

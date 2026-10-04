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
}

const CONGREGATION_ORG_SLUG = "congregation";

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
 * gerar um novo invalida o anterior. Sem validade — vale até revogar.
 */
export async function createPublicShareToken(): Promise<ShareActionResult> {
  let ownerId: string;
  try {
    ownerId = (await requireOwnerUser()).id;
  } catch {
    return { ok: false, error: "Solo el owner puede generar el enlace." };
  }
  const db = getDb();
  let organizationId: string;
  try {
    organizationId = await ensureShareOrganization();
  } catch {
    return { ok: false, error: "No se pudo preparar la organización." };
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateShareToken();
    try {
      await db.delete(publicShares).where(eq(publicShares.organizationId, organizationId));
      await db.insert(publicShares).values({
        id: randomUUID(),
        organizationId,
        tokenHash: hashShareToken(token),
        createdBy: ownerId,
      });
      revalidatePath("/administracion");
      return { ok: true, token, url: publicShareUrl(token) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("unique")) throw error;
    }
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
  const db = getDb();
  try {
    const organizationId = await ensureShareOrganization();
    await db.delete(publicShares).where(eq(publicShares.organizationId, organizationId));
  } catch {
    return { ok: false, error: "No se pudo revocar el enlace." };
  }
  revalidatePath("/administracion");
  return { ok: true };
}

"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/features/auth/infrastructure/better-auth";
import { members, organizations } from "@/features/auth/infrastructure/organization-schema";
import { getDb } from "@/shared/lib/db";

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  role: string;
}

/** Organizações do usuário logado (id, nome, papel). */
export async function listMyOrganizations(): Promise<OrganizationMembership[]> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return [];
  const rows = await getDb()
    .select({
      organizationId: members.organizationId,
      organizationName: organizations.name,
      role: members.role,
    })
    .from(members)
    .innerJoin(organizations, eq(members.organizationId, organizations.id))
    .where(eq(members.userId, session.user.id));
  return rows;
}

/** Organização ativa da sessão (null se nenhuma selecionada ou sem vínculo). */
export async function getActiveOrganization(): Promise<OrganizationMembership | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = (session?.session as { activeOrganizationId?: string | null } | undefined)
    ?.activeOrganizationId;
  if (!session?.user || !organizationId) return null;
  const rows = await getDb()
    .select({
      organizationId: members.organizationId,
      organizationName: organizations.name,
      role: members.role,
    })
    .from(members)
    .innerJoin(organizations, eq(members.organizationId, organizations.id))
    .where(and(eq(members.organizationId, organizationId), eq(members.userId, session.user.id)))
    .limit(1);
  return rows[0] ?? null;
}

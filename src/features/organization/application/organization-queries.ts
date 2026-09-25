import { desc, eq } from "drizzle-orm";
import { requireAuthenticatedUser, requireOwnerUser } from "@/features/auth/application/session";
import {
  invitations,
  joinTokens,
  members,
} from "@/features/auth/infrastructure/organization-schema";
import { users } from "@/features/auth/infrastructure/user-schema";
import { getDb } from "@/shared/lib/db";

function toISO(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export interface InvitationItem {
  id: string;
  email: string;
  role: "admin" | "member";
  status: string;
  expiresAt: string;
  createdAt: string;
}

function toInvitationRole(value: string): "admin" | "member" {
  return value === "admin" ? "admin" : "member";
}

/** Convites da congregação (app de congregação única: sem filtro por org). */
export async function listInvitations(): Promise<InvitationItem[]> {
  await requireOwnerUser();
  const rows = await getDb()
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
    })
    .from(invitations)
    .orderBy(desc(invitations.createdAt));
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: toInvitationRole(row.role ?? "member"),
    status: row.status,
    expiresAt: toISO(row.expiresAt),
    createdAt: toISO(row.createdAt),
  }));
}

export interface PendingJoinTokenItem {
  id: string;
  code: string;
  userId: string;
  userName: string;
  userEmail: string;
  expiresAt: string;
}

/** Códigos de entrada válidos (não usados, não vencidos) com os dados de quem gerou. */
export async function listPendingJoinTokens(): Promise<PendingJoinTokenItem[]> {
  await requireOwnerUser();
  const rows = await getDb()
    .select({
      id: joinTokens.id,
      code: joinTokens.code,
      userId: joinTokens.userId,
      usedAt: joinTokens.usedAt,
      expiresAt: joinTokens.expiresAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(joinTokens)
    .innerJoin(users, eq(users.id, joinTokens.userId))
    .orderBy(desc(joinTokens.createdAt));
  const now = new Date();
  return rows
    .filter((row) => row.usedAt === null && new Date(row.expiresAt) > now)
    .map((row) => ({
      id: row.id,
      code: row.code,
      userId: row.userId,
      userName: row.userName,
      userEmail: row.userEmail,
      expiresAt: toISO(row.expiresAt),
    }));
}

export interface ActiveJoinTokenCode {
  userId: string;
  code: string;
  expiresAt: string;
}

/** Códigos ativos por usuário (só owner vê: credencial de uso único). */
export async function listActiveJoinTokenCodes(): Promise<ActiveJoinTokenCode[]> {
  await requireOwnerUser();
  const rows = await getDb()
    .select({
      userId: joinTokens.userId,
      code: joinTokens.code,
      usedAt: joinTokens.usedAt,
      expiresAt: joinTokens.expiresAt,
    })
    .from(joinTokens)
    .orderBy(desc(joinTokens.createdAt));
  const now = new Date();
  return rows
    .filter((row) => row.usedAt === null && new Date(row.expiresAt) > now)
    .map((row) => ({ userId: row.userId, code: row.code, expiresAt: toISO(row.expiresAt) }));
}

export interface MyJoinToken {
  code: string;
  expiresAt: string;
}
/** Código ativo do usuário logado (null se não gerou ou se venceu/foi usado). */
export async function getMyJoinToken(): Promise<MyJoinToken | null> {
  const user = await requireAuthenticatedUser();
  const rows = await getDb()
    .select({
      code: joinTokens.code,
      usedAt: joinTokens.usedAt,
      expiresAt: joinTokens.expiresAt,
    })
    .from(joinTokens)
    .where(eq(joinTokens.userId, user.id))
    .orderBy(desc(joinTokens.createdAt))
    .limit(1);
  const row = rows[0];
  if (!row || row.usedAt !== null || new Date(row.expiresAt) <= new Date()) return null;
  return { code: row.code, expiresAt: toISO(row.expiresAt) };
}

/**
 * Associação à organização: owner/admin entram pelo papel (concedido só pelo
 * owner); membro precisa de vínculo na tabela `member`, criado ao ser
 * admitido por convite ou código. Ninguém é associado automaticamente.
 */
export async function isUserAssociated(user: { id: string; role: string }): Promise<boolean> {
  if (user.role === "owner" || user.role === "admin") return true;
  const rows = await getDb()
    .select({ id: members.id })
    .from(members)
    .where(eq(members.userId, user.id))
    .limit(1);
  return rows.length > 0;
}

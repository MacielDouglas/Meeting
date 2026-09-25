import { and, asc, eq, isNotNull, isNull, ne, or } from "drizzle-orm";
import {
  requireAuthenticatedUser,
  requireOwnerUser,
  requirePrivilegedUser,
} from "@/features/auth/application/session";
import { members } from "@/features/auth/infrastructure/organization-schema";
import { users } from "@/features/auth/infrastructure/user-schema";
import { getFullName, type Person, type PersonSummary } from "@/features/people/domain/person";
import { persons } from "@/features/people/infrastructure/person-schema";
import { getDb } from "@/shared/lib/db";

export interface LinkedPerson {
  id: string;
  firstName: string;
  lastName: string;
  sex: "male" | "female";
}

/** Pessoa vinculada ao usuário (para "minha semana" na página inicial). */
export async function getPersonByUserId(userId: string): Promise<LinkedPerson | null> {
  await requireAuthenticatedUser();
  const rows = await getDb()
    .select({
      id: persons.id,
      firstName: persons.firstName,
      lastName: persons.lastName,
      sex: persons.sex,
    })
    .from(persons)
    .where(eq(persons.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...row, sex: row.sex as "male" | "female" };
}

export interface UserWithRole {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  linkedPersonName: string | null;
}

export async function listPersons(): Promise<PersonSummary[]> {
  await requirePrivilegedUser();
  return getDb()
    .select({
      id: persons.id,
      firstName: persons.firstName,
      lastName: persons.lastName,
      sex: persons.sex,
    })
    .from(persons)
    .orderBy(asc(persons.firstName), asc(persons.lastName));
}

export async function getPerson(id: string): Promise<Person | null> {
  await requirePrivilegedUser();
  const rows = await getDb().select().from(persons).where(eq(persons.id, id)).limit(1);
  return rows[0] ?? null;
}

export interface PersonOption {
  id: string;
  label: string;
}

export async function listPersonOptions(excludeId?: string): Promise<PersonOption[]> {
  await requirePrivilegedUser();
  const onlyHeads = eq(persons.familyHead, true);
  const rows = excludeId
    ? await getDb()
        .select({ id: persons.id, firstName: persons.firstName, lastName: persons.lastName })
        .from(persons)
        .where(and(onlyHeads, ne(persons.id, excludeId)))
        .orderBy(asc(persons.firstName), asc(persons.lastName))
    : await getDb()
        .select({ id: persons.id, firstName: persons.firstName, lastName: persons.lastName })
        .from(persons)
        .where(onlyHeads)
        .orderBy(asc(persons.firstName), asc(persons.lastName));
  return rows.map((row) => ({ id: row.id, label: getFullName(row) }));
}

export async function listUsersWithRoles(): Promise<UserWithRole[]> {
  await requirePrivilegedUser();
  const db = getDb();
  const userRows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .orderBy(asc(users.name));
  const linkedRows = await db
    .select({ userId: persons.userId, firstName: persons.firstName, lastName: persons.lastName })
    .from(persons)
    .where(isNotNull(persons.userId));
  // A lista é da organização: entram owner/admin pelo papel e membros com
  // vínculo. Removidos (sem vínculo) somem daqui até serem admitidos de novo.
  const memberRows = await db.select({ userId: members.userId }).from(members);
  const memberIds = new Set(memberRows.map((row) => row.userId));
  const linkedByUserId = new Map(
    linkedRows
      .filter((row): row is typeof row & { userId: string } => row.userId !== null)
      .map((row) => [row.userId, getFullName(row)] as const),
  );
  return userRows
    .filter((row) => row.role !== "member" || memberIds.has(row.id))
    .map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      linkedPersonName: linkedByUserId.get(row.id) ?? null,
    }));
}

/** Todas as contas (associadas ou não): para o estado dos convites. Só owner. */
export async function listUserAccounts(): Promise<{ id: string; email: string }[]> {
  await requireOwnerUser();
  const rows = await getDb().select({ id: users.id, email: users.email }).from(users);
  return rows.map((row) => ({ id: row.id, email: row.email }));
}

export interface UserOption {
  id: string;
  label: string;
}
/**
 * Usuários elegíveis para vínculo: só da organização (owner/admin pelo papel,
 * membro com vínculo) e sem pessoa — exceto o já vinculado a `linkedPersonId`
 * e o `includeUserId` explícito (pré-seleção da admissão).
 */
export async function listUserOptions(
  linkedPersonId?: string,
  includeUserId?: string,
): Promise<UserOption[]> {
  await requirePrivilegedUser();
  const db = getDb();
  const condition = linkedPersonId
    ? or(isNull(persons.userId), eq(persons.id, linkedPersonId))
    : isNull(persons.userId);
  const [rows, memberRows] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .leftJoin(persons, eq(persons.userId, users.id))
      .where(condition)
      .orderBy(asc(users.name)),
    db.select({ userId: members.userId }).from(members),
  ]);
  const memberIds = new Set(memberRows.map((row) => row.userId));
  return rows
    .filter((row) => row.role !== "member" || memberIds.has(row.id) || row.id === includeUserId)
    .map((row) => ({ id: row.id, label: `${row.name} (${row.email})` }));
}

/** Pessoas sem usuário vinculado (candidatas a vincular na admissão). Só owner. */
export async function listUnlinkedPersonOptions(): Promise<PersonOption[]> {
  await requireOwnerUser();
  const rows = await getDb()
    .select({ id: persons.id, firstName: persons.firstName, lastName: persons.lastName })
    .from(persons)
    .where(isNull(persons.userId))
    .orderBy(asc(persons.firstName), asc(persons.lastName));
  return rows.map((row) => ({ id: row.id, label: getFullName(row) }));
}

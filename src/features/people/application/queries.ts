import { and, asc, eq, isNotNull, isNull, ne, or } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/features/auth/application/session";
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
  await requireAuthenticatedUser();
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
  await requireAuthenticatedUser();
  const rows = await getDb().select().from(persons).where(eq(persons.id, id)).limit(1);
  return rows[0] ?? null;
}

export interface PersonOption {
  id: string;
  label: string;
}

export async function listPersonOptions(excludeId?: string): Promise<PersonOption[]> {
  await requireAuthenticatedUser();
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
  await requireAuthenticatedUser();
  const db = getDb();
  const userRows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .orderBy(asc(users.name));
  const linkedRows = await db
    .select({ userId: persons.userId, firstName: persons.firstName, lastName: persons.lastName })
    .from(persons)
    .where(isNotNull(persons.userId));
  const linkedByUserId = new Map(
    linkedRows
      .filter((row): row is typeof row & { userId: string } => row.userId !== null)
      .map((row) => [row.userId, getFullName(row)] as const),
  );
  return userRows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    linkedPersonName: linkedByUserId.get(row.id) ?? null,
  }));
}

export interface UserOption {
  id: string;
  label: string;
}

export async function listUserOptions(linkedPersonId?: string): Promise<UserOption[]> {
  await requireAuthenticatedUser();
  const condition = linkedPersonId
    ? or(isNull(persons.userId), eq(persons.id, linkedPersonId))
    : isNull(persons.userId);
  const rows = await getDb()
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .leftJoin(persons, eq(persons.userId, users.id))
    .where(condition)
    .orderBy(asc(users.name));
  return rows.map((row) => ({ id: row.id, label: `${row.name} (${row.email})` }));
}

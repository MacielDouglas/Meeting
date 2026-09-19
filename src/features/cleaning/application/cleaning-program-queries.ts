"use server";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/features/auth/application/session";
import {
  cleaningAssignments,
  cleaningPrograms,
} from "@/features/cleaning/infrastructure/cleaning-program-schema";
import { cleaningSectors } from "@/features/cleaning/infrastructure/cleaning-schema";
import { persons } from "@/features/people/infrastructure/person-schema";
import { getDb } from "@/shared/lib/db";

export interface CleaningProgramItem {
  id: string;
  typeKey: string;
  startDate: string;
  endDate: string;
  status: "draft" | "confirmed" | "archived";
  createdBy: string | null;
  createdAt: Date;
  assignmentCount: number;
}

export interface CleaningAssignmentItem {
  id: string;
  programId: string;
  assignmentDate: string;
  sectorKey: string;
  sectorName: string;
  personId: string | null;
  personName: string;
  isFamily: boolean;
  sortOrder: number;
  createdAt: Date;
}

export interface PersonCleaningHistory {
  sectorKey: string;
  sectorName: string;
  assignmentDate: string;
}

export async function listCleaningPrograms(typeKey?: string): Promise<CleaningProgramItem[]> {
  await requireAuthenticatedUser();
  const db = getDb();
  const rows = await db
    .select({
      id: cleaningPrograms.id,
      typeKey: cleaningPrograms.typeKey,
      startDate: cleaningPrograms.startDate,
      endDate: cleaningPrograms.endDate,
      status: cleaningPrograms.status,
      createdBy: cleaningPrograms.createdBy,
      createdAt: cleaningPrograms.createdAt,
      assignmentCount: sql<number>`cast(count(${cleaningAssignments.id}) as int)`,
    })
    .from(cleaningPrograms)
    .leftJoin(cleaningAssignments, eq(cleaningPrograms.id, cleaningAssignments.programId))
    .where(
      typeKey
        ? eq(cleaningPrograms.typeKey, typeKey as "per_meeting" | "weekly" | "general")
        : undefined,
    )
    .groupBy(
      cleaningPrograms.id,
      cleaningPrograms.typeKey,
      cleaningPrograms.startDate,
      cleaningPrograms.endDate,
      cleaningPrograms.status,
      cleaningPrograms.createdBy,
      cleaningPrograms.createdAt,
    )
    .orderBy(desc(cleaningPrograms.createdAt));
  return rows.map((row) => ({
    ...row,
    status: row.status as CleaningProgramItem["status"],
  }));
}

export async function getCleaningProgramDetail(
  programId: string,
): Promise<{ program: CleaningProgramItem; assignments: CleaningAssignmentItem[] }> {
  await requireAuthenticatedUser();
  const db = getDb();

  const programRows = await db
    .select()
    .from(cleaningPrograms)
    .where(eq(cleaningPrograms.id, programId))
    .limit(1);
  const program = programRows[0];
  if (!program) throw new Error("Programa não encontrado.");

  const assignmentRows = await db
    .select()
    .from(cleaningAssignments)
    .where(eq(cleaningAssignments.programId, programId))
    .orderBy(asc(cleaningAssignments.assignmentDate), asc(cleaningAssignments.sortOrder));

  return {
    program: {
      ...program,
      status: program.status as CleaningProgramItem["status"],
      assignmentCount: assignmentRows.length,
    },
    assignments: assignmentRows.map((row) => ({
      ...row,
      isFamily: row.isFamily,
    })),
  };
}

export async function getPersonCleaningHistory(
  personId: string,
  limit = 10,
): Promise<PersonCleaningHistory[]> {
  const map = await getManyPersonCleaningHistories([personId], limit);
  return map.get(personId) ?? [];
}

/**
 * Histórico de várias pessoas em 1 query (evita N+1 no modal de troca).
 * Retorna no máximo `limit` designações por pessoa, das mais recentes.
 */
export async function getManyPersonCleaningHistories(
  personIds: string[],
  limit = 10,
): Promise<Map<string, PersonCleaningHistory[]>> {
  await requireAuthenticatedUser();
  const result = new Map<string, PersonCleaningHistory[]>();
  if (personIds.length === 0) return result;
  const db = getDb();
  // Busca folgada e fatia por pessoa no JS (neon-http não suporta lateral join).
  const rows = await db
    .select({
      personId: cleaningAssignments.personId,
      sectorKey: cleaningAssignments.sectorKey,
      sectorName: cleaningAssignments.sectorName,
      assignmentDate: cleaningAssignments.assignmentDate,
    })
    .from(cleaningAssignments)
    .where(inArray(cleaningAssignments.personId, personIds))
    .orderBy(desc(cleaningAssignments.assignmentDate))
    .limit(Math.max(personIds.length * limit, limit));
  for (const row of rows) {
    if (!row.personId) continue;
    const list = result.get(row.personId) ?? [];
    if (list.length < limit) {
      list.push({
        sectorKey: row.sectorKey,
        sectorName: row.sectorName,
        assignmentDate: row.assignmentDate,
      });
      result.set(row.personId, list);
    }
  }
  return result;
}

export interface EligiblePerson {
  id: string;
  firstName: string;
  lastName: string;
  sex: "male" | "female";
  cleaning: boolean;
  young: boolean;
  familyHead: boolean;
  familyMemberId: string | null;
}

export async function listEligiblePersons(
  requiredSex?: "any" | "male" | "female",
  options?: { allowYoung?: boolean },
): Promise<EligiblePerson[]> {
  await requireAuthenticatedUser();
  const db = getDb();
  const conditions = [eq(persons.cleaning, true)];
  if (requiredSex === "male") conditions.push(eq(persons.sex, "male"));
  else if (requiredSex === "female") conditions.push(eq(persons.sex, "female"));
  if (options?.allowYoung === false) conditions.push(eq(persons.young, false));

  const rows = await db
    .select({
      id: persons.id,
      firstName: persons.firstName,
      lastName: persons.lastName,
      sex: persons.sex,
      cleaning: persons.cleaning,
      young: persons.young,
      familyHead: persons.familyHead,
      familyMemberId: persons.familyMemberId,
    })
    .from(persons)
    .where(and(...conditions))
    .orderBy(asc(persons.firstName), asc(persons.lastName));

  return rows.map((row) => ({
    ...row,
    sex: row.sex as "male" | "female",
    young: row.young ?? false,
  }));
}

export async function listFamilyMembers(familyMemberId: string): Promise<EligiblePerson[]> {
  await requireAuthenticatedUser();
  const db = getDb();
  const rows = await db
    .select({
      id: persons.id,
      firstName: persons.firstName,
      lastName: persons.lastName,
      sex: persons.sex,
      cleaning: persons.cleaning,
      young: persons.young,
      familyHead: persons.familyHead,
      familyMemberId: persons.familyMemberId,
    })
    .from(persons)
    .where(eq(persons.familyMemberId, familyMemberId))
    .orderBy(asc(persons.firstName));

  return rows.map((row) => ({
    ...row,
    sex: row.sex as "male" | "female",
    young: row.young ?? false,
    cleaning: row.cleaning,
    familyHead: row.familyHead,
  }));
}

export async function getPersonAssignmentCountInSector(
  personId: string,
  sectorKey: string,
): Promise<number> {
  await requireAuthenticatedUser();
  const db = getDb();
  const rows = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(cleaningAssignments)
    .where(
      and(eq(cleaningAssignments.personId, personId), eq(cleaningAssignments.sectorKey, sectorKey)),
    );
  return rows[0]?.count ?? 0;
}

export async function getLatestAssignmentDate(personId: string): Promise<string | null> {
  await requireAuthenticatedUser();
  const db = getDb();
  const rows = await db
    .select({ assignmentDate: cleaningAssignments.assignmentDate })
    .from(cleaningAssignments)
    .where(eq(cleaningAssignments.personId, personId))
    .orderBy(desc(cleaningAssignments.assignmentDate))
    .limit(1);
  return rows[0]?.assignmentDate ?? null;
}

export async function getEnabledCleaningSectors(typeKey: string) {
  await requireAuthenticatedUser();
  const db = getDb();
  const rows = await db
    .select()
    .from(cleaningSectors)
    .where(
      and(
        eq(cleaningSectors.cleaningTypeKey, typeKey as "per_meeting" | "weekly" | "general"),
        eq(cleaningSectors.enabled, true),
      ),
    )
    .orderBy(asc(cleaningSectors.sortOrder));
  return rows;
}

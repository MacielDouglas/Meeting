"use server";

import { desc, eq, sql } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/features/auth/application/session";
import {
  dutyAssignments,
  dutyPrograms,
} from "@/features/meeting-duties/infrastructure/duty-schema";
import { persons } from "@/features/people/infrastructure/person-schema";
import { getDb } from "@/shared/lib/db";

export interface DutyProgramItem {
  id: string;
  startDate: string;
  endDate: string;
  status: "draft" | "confirmed" | "archived";
  createdBy: string | null;
  createdAt: Date;
  assignmentCount: number;
}

export interface DutyAssignmentItem {
  id: string;
  programId: string;
  assignmentDate: string;
  meetingKind: string;
  dutyKey: string;
  postLabel: string;
  side: string | null;
  personId: string | null;
  personName: string;
  isManual: boolean;
  sortOrder: number;
}

export interface DutyPersonItem {
  id: string;
  name: string;
  sex: "male" | "female";
  flags: {
    usher: boolean;
    sound: boolean;
    video: boolean;
    microphone: boolean;
    platform: boolean;
  };
}

export async function listDutyPrograms(): Promise<DutyProgramItem[]> {
  await requireAuthenticatedUser();
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: dutyPrograms.id,
        startDate: dutyPrograms.startDate,
        endDate: dutyPrograms.endDate,
        status: dutyPrograms.status,
        createdBy: dutyPrograms.createdBy,
        createdAt: dutyPrograms.createdAt,
        assignmentCount: sql<number>`cast(count(${dutyAssignments.id}) as int)`,
      })
      .from(dutyPrograms)
      .leftJoin(dutyAssignments, eq(dutyPrograms.id, dutyAssignments.programId))
      .groupBy(
        dutyPrograms.id,
        dutyPrograms.startDate,
        dutyPrograms.endDate,
        dutyPrograms.status,
        dutyPrograms.createdBy,
        dutyPrograms.createdAt,
      )
      .orderBy(desc(dutyPrograms.createdAt));
    return rows.map((row) => ({ ...row, status: row.status as DutyProgramItem["status"] }));
  } catch {
    // Tabelas ainda não migradas no banco: lista vazia em vez de quebrar a página.
    return [];
  }
}

export async function getDutyProgramDetail(programId: string): Promise<{
  program: DutyProgramItem;
  assignments: DutyAssignmentItem[];
} | null> {
  await requireAuthenticatedUser();
  const db = getDb();
  let programs: (typeof dutyPrograms.$inferSelect)[];
  try {
    programs = await db.select().from(dutyPrograms).where(eq(dutyPrograms.id, programId));
  } catch {
    return null;
  }
  const program = programs[0];
  if (!program) return null;
  const assignments = await db
    .select()
    .from(dutyAssignments)
    .where(eq(dutyAssignments.programId, programId))
    .orderBy(dutyAssignments.assignmentDate, dutyAssignments.sortOrder);
  const count = await db
    .select({ count: sql<number>`cast(count(${dutyAssignments.id}) as int)` })
    .from(dutyAssignments)
    .where(eq(dutyAssignments.programId, programId));
  return {
    program: {
      id: program.id,
      startDate: program.startDate,
      endDate: program.endDate,
      status: program.status as DutyProgramItem["status"],
      createdBy: program.createdBy,
      createdAt: program.createdAt,
      assignmentCount: count[0]?.count ?? 0,
    },
    assignments: assignments.map((a) => ({
      id: a.id,
      programId: a.programId,
      assignmentDate: a.assignmentDate,
      meetingKind: a.meetingKind,
      dutyKey: a.dutyKey,
      postLabel: a.postLabel,
      side: a.side,
      personId: a.personId,
      personName: a.personName,
      isManual: a.isManual,
      sortOrder: a.sortOrder,
    })),
  };
}

/** Pessoas com flags de apoio (filtro de sexo/flag acontece no domínio). */
export async function listDutyEligiblePersons(): Promise<DutyPersonItem[]> {
  await requireAuthenticatedUser();
  let rows: {
    id: string;
    firstName: string;
    lastName: string;
    sex: "male" | "female";
    usher: boolean;
    sound: boolean;
    video: boolean;
    microphone: boolean;
    platform: boolean;
  }[];
  try {
    const db = getDb();
    rows = await db
      .select({
        id: persons.id,
        firstName: persons.firstName,
        lastName: persons.lastName,
        sex: persons.sex,
        usher: persons.usher,
        sound: persons.sound,
        video: persons.video,
        microphone: persons.microphone,
        platform: persons.platform,
      })
      .from(persons);
  } catch {
    return [];
  }
  return rows
    .map((row) => ({
      id: row.id,
      name: `${row.firstName} ${row.lastName}`.trim(),
      sex: row.sex as "male" | "female",
      flags: {
        usher: row.usher,
        sound: row.sound,
        video: row.video,
        microphone: row.microphone,
        platform: row.platform,
      },
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
}

/** Histórico completo (pessoa, data) para o rodízio justo. */
export async function listPersonDutyHistory(): Promise<{ personId: string; date: string }[]> {
  await requireAuthenticatedUser();
  try {
    const db = getDb();
    const rows = await db
      .select({
        personId: dutyAssignments.personId,
        date: dutyAssignments.assignmentDate,
      })
      .from(dutyAssignments);
    return rows.flatMap((row) =>
      row.personId ? [{ personId: row.personId, date: row.date }] : [],
    );
  } catch {
    return [];
  }
}

/** Candidatos de um posto (homens com a flag), para edição manual. */
export async function listDutyCandidates(
  dutyKey: "usher" | "sound" | "video" | "microphone" | "platform",
): Promise<{ id: string; name: string }[]> {
  const people = await listDutyEligiblePersons();
  return people
    .filter((p) => p.sex === "male" && p.flags[dutyKey])
    .map((p) => ({ id: p.id, name: p.name }));
}

/** Datas com escala ativa (bloqueiam novo programa no período). */
export async function listActiveDutyDates(): Promise<Set<string>> {
  await requireAuthenticatedUser();
  try {
    const db = getDb();
    const rows = await db
      .select({ date: dutyAssignments.assignmentDate })
      .from(dutyAssignments)
      .innerJoin(dutyPrograms, eq(dutyAssignments.programId, dutyPrograms.id))
      .where(sql`${dutyPrograms.status} <> 'archived'`);
    return new Set(rows.map((row) => row.date));
  } catch {
    return new Set();
  }
}

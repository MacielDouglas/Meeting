"use server";

import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import {
  requireAuthenticatedUser,
  requirePrivilegedUser,
} from "@/features/auth/application/session";
import { designationSectors } from "@/features/designations/infrastructure/designation-schema";
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
  dutyName: string;
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
  await requirePrivilegedUser();
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
  await requirePrivilegedUser();
  const db = getDb();
  let programs: (typeof dutyPrograms.$inferSelect)[];
  try {
    programs = await db.select().from(dutyPrograms).where(eq(dutyPrograms.id, programId));
  } catch {
    return null;
  }
  const program = programs[0];
  if (!program) return null;
  const assignmentRows = await db
    .select()
    .from(dutyAssignments)
    .where(eq(dutyAssignments.programId, programId))
    .orderBy(dutyAssignments.assignmentDate, dutyAssignments.sortOrder);
  // Nome do posto a partir do setor de designação (cai para o rótulo salvo;
  // busca isolada para a falta dessa tabela não esconder as designações).
  let sectorNames = new Map<string, string>();
  try {
    const sectorRows = await db
      .select({ personFlag: designationSectors.personFlag, name: designationSectors.name })
      .from(designationSectors);
    sectorNames = new Map(
      sectorRows.flatMap((row) => (row.personFlag ? [[row.personFlag, row.name]] : [])),
    );
  } catch (error) {
    console.error("[duties] falha ao buscar nomes dos setores", { programId, error });
  }
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
    assignments: assignmentRows.map((a) => ({
      id: a.id,
      programId: a.programId,
      assignmentDate: a.assignmentDate,
      meetingKind: a.meetingKind,
      dutyKey: a.dutyKey,
      dutyName: sectorNames.get(a.dutyKey) ?? a.postLabel,
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
  await requirePrivilegedUser();
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
  await requirePrivilegedUser();
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

export interface PersonDutyItem {
  assignmentDate: string;
  dutyKey: string;
  postLabel: string;
  side: string | null;
  sortOrder: number;
}

/** Apoio En la reunión de uma pessoa no intervalo (para "minha semana"). */
export async function listPersonDutiesInRange(
  personId: string,
  startDate: string,
  endDate: string,
): Promise<PersonDutyItem[]> {
  await requireAuthenticatedUser();
  try {
    const db = getDb();
    const rows = await db
      .select({
        assignmentDate: dutyAssignments.assignmentDate,
        dutyKey: dutyAssignments.dutyKey,
        postLabel: dutyAssignments.postLabel,
        side: dutyAssignments.side,
        sortOrder: dutyAssignments.sortOrder,
      })
      .from(dutyAssignments)
      .where(
        and(
          eq(dutyAssignments.personId, personId),
          gte(dutyAssignments.assignmentDate, startDate),
          lte(dutyAssignments.assignmentDate, endDate),
        ),
      )
      .orderBy(asc(dutyAssignments.assignmentDate), asc(dutyAssignments.sortOrder));
    return rows;
  } catch {
    return [];
  }
}

/**
 * Próximos apoios da pessoa a partir de uma data (para a home) — dados
 * próprios, visível para qualquer usuário logado.
 */
export async function listUpcomingPersonDuties(
  personId: string,
  fromDate: string,
  limit = 6,
): Promise<PersonDutyItem[]> {
  await requireAuthenticatedUser();
  try {
    const db = getDb();
    const rows = await db
      .select({
        assignmentDate: dutyAssignments.assignmentDate,
        dutyKey: dutyAssignments.dutyKey,
        postLabel: dutyAssignments.postLabel,
        side: dutyAssignments.side,
        sortOrder: dutyAssignments.sortOrder,
      })
      .from(dutyAssignments)
      .where(
        and(eq(dutyAssignments.personId, personId), gte(dutyAssignments.assignmentDate, fromDate)),
      )
      .orderBy(asc(dutyAssignments.assignmentDate), asc(dutyAssignments.sortOrder))
      .limit(limit);
    return rows;
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
  await requirePrivilegedUser();
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

export interface UpcomingDutyAssignment {
  assignmentDate: string;
  dutyKey: string;
  dutyName: string;
  postLabel: string;
  side: string | null;
  personName: string;
  status: string;
  sortOrder: number;
}

/**
 * Apoio En la reunión por data (só programas ativos) para os cards de
 * Designações — visível para qualquer usuário logado.
 */
export async function listDutyAssignmentsForDates(
  dates: string[],
): Promise<UpcomingDutyAssignment[]> {
  await requireAuthenticatedUser();
  if (dates.length === 0) return [];
  try {
    const db = getDb();
    const rows = await db
      .select({
        assignmentDate: dutyAssignments.assignmentDate,
        dutyKey: dutyAssignments.dutyKey,
        postLabel: dutyAssignments.postLabel,
        side: dutyAssignments.side,
        personName: dutyAssignments.personName,
        status: dutyPrograms.status,
        sortOrder: dutyAssignments.sortOrder,
      })
      .from(dutyAssignments)
      .innerJoin(dutyPrograms, eq(dutyAssignments.programId, dutyPrograms.id))
      .where(inArray(dutyAssignments.assignmentDate, dates))
      .orderBy(asc(dutyAssignments.assignmentDate), asc(dutyAssignments.sortOrder));
    // Nomes dos postos em busca isolada: a falta da tabela de setores não
    // pode esconder as designações (cai para o rótulo salvo).
    let sectorNames = new Map<string, string>();
    try {
      const sectorRows = await db
        .select({ personFlag: designationSectors.personFlag, name: designationSectors.name })
        .from(designationSectors);
      sectorNames = new Map(
        sectorRows.flatMap((row) => (row.personFlag ? [[row.personFlag, row.name]] : [])),
      );
    } catch (error) {
      console.error("[duties] falha ao buscar nomes dos setores", { dates, error });
    }
    return rows.map((row) => ({
      ...row,
      dutyName: sectorNames.get(row.dutyKey) ?? row.postLabel,
    }));
  } catch (error) {
    console.error("[duties] falha ao listar apoio por data", { dates, error });
    return [];
  }
}

/**
 * Datas com apoio a partir de uma data (só programas ativos), para os cards
 * de Designações encontrarem designações fora dos dias de reunião.
 */
export async function listUpcomingDutyDates(fromDate: string, limit = 8): Promise<string[]> {
  await requireAuthenticatedUser();
  try {
    const db = getDb();
    const rows = await db
      .selectDistinct({ date: dutyAssignments.assignmentDate })
      .from(dutyAssignments)
      .innerJoin(dutyPrograms, eq(dutyAssignments.programId, dutyPrograms.id))
      .where(gte(dutyAssignments.assignmentDate, fromDate))
      .orderBy(asc(dutyAssignments.assignmentDate))
      .limit(limit);
    return rows.map((row) => row.date);
  } catch (error) {
    console.error("[duties] falha ao listar datas com apoio", { fromDate, error });
    return [];
  }
}

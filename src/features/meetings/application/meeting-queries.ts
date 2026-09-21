"use server";

import { and, asc, eq, gte, lte } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/features/auth/application/session";
import {
  type MeetingKind,
  meetingAssignments,
  meetingPrograms,
} from "@/features/meetings/infrastructure/meeting-schema";
import { getDb } from "@/shared/lib/db";

export interface MeetingAssignmentItem {
  id: string;
  programId: string;
  partKey: string;
  section: string;
  title: string;
  subtitle: string;
  startTime: string;
  durationMinutes: number;
  personId: string | null;
  personName: string;
  helperPersonId: string | null;
  helperPersonName: string;
  songNumber: number | null;
  songTheme: string;
  classroom: string;
  study: string;
  source: string;
  notes: string;
  speakerCongregation: string;
  sortOrder: number;
}

export interface PdfProgramItem {
  id: string;
  kind: MeetingKind;
  weekStart: string;
  date: string;
  assignments: MeetingAssignmentItem[];
}

/** Segunda-feira da semana de uma data ISO (expande o filtro do intervalo). */
function mondayOfWeek(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
  return dt.toISOString().slice(0, 10);
}

/** Programas de um tipo com semana no intervalo (para o PDF de designações). */
export async function listProgramsForPdf(
  kind: MeetingKind,
  from: string,
  to: string,
): Promise<PdfProgramItem[]> {
  await requireAuthenticatedUser();
  const db = getDb();
  const programs = await db
    .select()
    .from(meetingPrograms)
    .where(
      and(
        eq(meetingPrograms.kind, kind),
        gte(meetingPrograms.weekStart, mondayOfWeek(from)),
        lte(meetingPrograms.weekStart, to),
      ),
    )
    .orderBy(asc(meetingPrograms.weekStart));
  const items: PdfProgramItem[] = [];
  for (const program of programs) {
    const assignmentRows = await db
      .select()
      .from(meetingAssignments)
      .where(eq(meetingAssignments.programId, program.id))
      .orderBy(asc(meetingAssignments.sortOrder));
    items.push({
      id: program.id,
      kind: program.kind,
      weekStart: program.weekStart,
      date: program.date,
      assignments: assignmentRows.map((row) => ({
        id: row.id,
        programId: row.programId,
        partKey: row.partKey,
        section: row.section,
        title: row.title,
        subtitle: row.subtitle,
        startTime: row.startTime,
        durationMinutes: row.durationMinutes,
        personId: row.personId,
        personName: row.personName,
        helperPersonId: row.helperPersonId,
        helperPersonName: row.helperPersonName,
        songNumber: row.songNumber,
        songTheme: row.songTheme,
        classroom: row.classroom ?? "A",
        study: row.study ?? "",
        source: row.source ?? "",
        notes: row.notes ?? "",
        speakerCongregation: row.speakerCongregation ?? "",
        sortOrder: row.sortOrder,
      })),
    });
  }
  return items;
}

/** Datas de reunião com programa salvo no intervalo (destaques do calendário). */
export async function listProgramDates(
  kind: MeetingKind,
  from: string,
  to: string,
): Promise<string[]> {
  await requireAuthenticatedUser();
  const db = getDb();
  const programs = await db
    .select({ date: meetingPrograms.date })
    .from(meetingPrograms)
    .where(
      and(
        eq(meetingPrograms.kind, kind),
        gte(meetingPrograms.weekStart, mondayOfWeek(from)),
        lte(meetingPrograms.weekStart, to),
      ),
    );
  return [...new Set(programs.map((p) => p.date))].sort();
}

export interface MeetingProgramItem {
  id: string;
  kind: MeetingKind;
  weekStart: string;
  date: string;
  outlineId: string | null;
  status: "draft" | "confirmed";
  exceptionType: string;
  exceptionLabel: string;
  assignmentCount: number;
}

function isMissingTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("meeting_programs") ||
    message.includes("meeting_assignments") ||
    message.includes("does not exist")
  );
}

export async function getMeetingProgram(
  kind: MeetingKind,
  weekStart: string,
): Promise<{ program: MeetingProgramItem; assignments: MeetingAssignmentItem[] } | null> {
  await requireAuthenticatedUser();
  const db = getDb();
  let rows: (typeof meetingPrograms.$inferSelect)[];
  try {
    rows = await db
      .select()
      .from(meetingPrograms)
      .where(and(eq(meetingPrograms.kind, kind), eq(meetingPrograms.weekStart, weekStart)))
      .limit(1);
  } catch (error) {
    if (isMissingTableError(error)) {
      console.error(
        "[meetings] tabela meeting_programs não existe. Execute `npm run db:push` para criar.",
        error,
      );
      return null;
    }
    throw error;
  }
  const program = rows[0];
  if (!program) return null;
  const assignmentRows = await db
    .select()
    .from(meetingAssignments)
    .where(eq(meetingAssignments.programId, program.id))
    .orderBy(asc(meetingAssignments.sortOrder));
  return {
    program: {
      id: program.id,
      kind: program.kind,
      weekStart: program.weekStart,
      date: program.date,
      outlineId: program.outlineId,
      status: program.status as "draft" | "confirmed",
      exceptionType: program.exceptionType ?? "",
      exceptionLabel: program.exceptionLabel ?? "",
      assignmentCount: assignmentRows.length,
    },
    assignments: assignmentRows.map((row) => ({
      id: row.id,
      programId: row.programId,
      partKey: row.partKey,
      section: row.section,
      title: row.title,
      subtitle: row.subtitle,
      startTime: row.startTime,
      durationMinutes: row.durationMinutes,
      personId: row.personId,
      personName: row.personName,
      helperPersonId: row.helperPersonId,
      helperPersonName: row.helperPersonName,
      songNumber: row.songNumber,
      songTheme: row.songTheme,
      classroom: row.classroom ?? "A",
      study: row.study ?? "",
      source: row.source ?? "",
      notes: row.notes ?? "",
      speakerCongregation: row.speakerCongregation ?? "",
      sortOrder: row.sortOrder,
    })),
  };
}

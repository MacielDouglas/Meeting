import { and, asc, eq, gte, lte } from "drizzle-orm";
import { dutyAssignments } from "@/features/meeting-duties/infrastructure/duty-schema";
import {
  meetingAssignments,
  meetingPrograms,
} from "@/features/meetings/infrastructure/meeting-schema";
import { meetingSettings } from "@/features/settings/infrastructure/settings-schema";
import { getWeekRange } from "@/features/weekly-schedule/domain/schedule";
import { getDb } from "@/shared/lib/db";

export interface PublicShareAssignment {
  partKey: string;
  section: string;
  title: string;
  subtitle: string;
  startTime: string;
  durationMinutes: number;
  personName: string;
  helperPersonName: string;
  songNumber: number | null;
  songTheme: string;
  speakerCongregation: string;
}

export interface PublicShareMeeting {
  kind: "midweek" | "weekend";
  date: string;
  assignments: PublicShareAssignment[];
}

export interface PublicShareDuty {
  date: string;
  meetingKind: string;
  dutyKey: string;
  postLabel: string;
  personName: string;
}

export interface PublicWeekPayload {
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  congregationName: string;
  midweek: PublicShareMeeting | null;
  weekend: PublicShareMeeting | null;
  duties: PublicShareDuty[];
}

async function loadMeeting(
  kind: "midweek" | "weekend",
  weekStart: string,
): Promise<PublicShareMeeting | null> {
  const db = getDb();
  const programs = await db
    .select()
    .from(meetingPrograms)
    .where(and(eq(meetingPrograms.kind, kind), eq(meetingPrograms.weekStart, weekStart)))
    .limit(1);
  const program = programs[0];
  if (!program) return null;
  const rows = await db
    .select()
    .from(meetingAssignments)
    .where(eq(meetingAssignments.programId, program.id))
    .orderBy(asc(meetingAssignments.sortOrder));
  return {
    kind,
    date: program.date,
    assignments: rows.map((row) => ({
      partKey: row.partKey,
      section: row.section,
      title: row.title,
      subtitle: row.subtitle,
      startTime: row.startTime,
      durationMinutes: row.durationMinutes,
      personName: row.personName,
      helperPersonName: row.helperPersonName,
      songNumber: row.songNumber,
      songTheme: row.songTheme,
      speakerCongregation: row.speakerCongregation ?? "",
    })),
  };
}

/**
 * Semana atual completa (programação + designações + apoio En la reunión).
 * Sem auth: a chamada só chega aqui com um token válido (rota pública).
 * Tabelas ausentes viram vazio — nunca 500 por migração pendente.
 */
export async function buildPublicWeekPayload(
  reference: Date = new Date(),
): Promise<PublicWeekPayload> {
  const { weekStart, weekEnd } = getWeekRange(reference);
  const db = getDb();

  let congregationName = "";
  try {
    const settings = await db
      .select({ congregationName: meetingSettings.congregationName })
      .from(meetingSettings)
      .limit(1);
    congregationName = settings[0]?.congregationName ?? "";
  } catch {
    congregationName = "";
  }

  let midweek: PublicShareMeeting | null = null;
  let weekend: PublicShareMeeting | null = null;
  try {
    [midweek, weekend] = await Promise.all([
      loadMeeting("midweek", weekStart),
      loadMeeting("weekend", weekStart),
    ]);
  } catch {
    midweek = null;
    weekend = null;
  }

  let duties: PublicShareDuty[] = [];
  try {
    const rows = await db
      .select({
        date: dutyAssignments.assignmentDate,
        meetingKind: dutyAssignments.meetingKind,
        dutyKey: dutyAssignments.dutyKey,
        postLabel: dutyAssignments.postLabel,
        personName: dutyAssignments.personName,
      })
      .from(dutyAssignments)
      .where(
        and(
          gte(dutyAssignments.assignmentDate, weekStart),
          lte(dutyAssignments.assignmentDate, weekEnd),
        ),
      )
      .orderBy(asc(dutyAssignments.assignmentDate), asc(dutyAssignments.sortOrder));
    duties = rows;
  } catch {
    duties = [];
  }

  return {
    weekStart,
    weekEnd,
    generatedAt: new Date().toISOString(),
    congregationName,
    midweek,
    weekend,
    duties,
  };
}

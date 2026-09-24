import { asc, desc, eq } from "drizzle-orm";
import { cache } from "react";
import { requirePrivilegedUser } from "@/features/auth/application/session";
import {
  DEFAULT_MEETING_SCHEDULE,
  type MeetingSchedule,
  type ScheduleExceptionType,
  type SpecialEventType,
  type WeekDay,
} from "@/features/settings/domain/settings";
import {
  meetingSettings,
  SETTINGS_ID,
  scheduleExceptions,
  specialEvents,
} from "@/features/settings/infrastructure/settings-schema";
import { getDb } from "@/shared/lib/db";

function toWeekDay(value: number): WeekDay {
  return Math.min(6, Math.max(0, value)) as WeekDay;
}

function isMissingCongregationColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("congregation_name");
}

// cache(): horários lidos uma vez por request, mesmo com chamadas repetidas
// (header, página, getWeeklySchedule, getMyWeek).
export const getMeetingSchedule = cache(async (): Promise<MeetingSchedule> => {
  const db = getDb();
  try {
    const rows = await db
      .select({
        congregationName: meetingSettings.congregationName,
        midweekDay: meetingSettings.midweekDay,
        midweekTime: meetingSettings.midweekTime,
        weekendDay: meetingSettings.weekendDay,
        weekendTime: meetingSettings.weekendTime,
      })
      .from(meetingSettings)
      .where(eq(meetingSettings.id, SETTINGS_ID))
      .limit(1);
    const row = rows[0];
    if (!row) return DEFAULT_MEETING_SCHEDULE;
    return {
      congregationName: row.congregationName ?? "",
      midweekDay: toWeekDay(row.midweekDay),
      midweekTime: row.midweekTime,
      weekendDay: toWeekDay(row.weekendDay),
      weekendTime: row.weekendTime,
    };
  } catch (error) {
    if (!isMissingCongregationColumnError(error)) {
      // Banco inacessível (rede, build sem banco): horários padrão em vez de
      // quebrar a página ou o prerender.
      console.error("[settings] falha ao ler meeting_settings, usando padrão", error);
      return DEFAULT_MEETING_SCHEDULE;
    }
    try {
      // Coluna ainda sem migração no banco: horários sem congregação.
      const rows = await db
        .select({
          midweekDay: meetingSettings.midweekDay,
          midweekTime: meetingSettings.midweekTime,
          weekendDay: meetingSettings.weekendDay,
          weekendTime: meetingSettings.weekendTime,
        })
        .from(meetingSettings)
        .where(eq(meetingSettings.id, SETTINGS_ID))
        .limit(1);
      const row = rows[0];
      if (!row) return DEFAULT_MEETING_SCHEDULE;
      return {
        congregationName: "",
        midweekDay: toWeekDay(row.midweekDay),
        midweekTime: row.midweekTime,
        weekendDay: toWeekDay(row.weekendDay),
        weekendTime: row.weekendTime,
      };
    } catch (fallbackError) {
      console.error("[settings] falha ao ler meeting_settings, usando padrão", fallbackError);
      return DEFAULT_MEETING_SCHEDULE;
    }
  }
});

export interface SpecialEventItem {
  id: string;
  type: SpecialEventType;
  title: string;
  startDate: string;
  endDate: string | null;
  startTime: string;
  notes: string | null;
  speakerName: string | null;
  midweekTheme: string | null;
  publicTalkTheme: string | null;
  finalTalkTheme: string | null;
}

const specialEventColumns = {
  id: specialEvents.id,
  type: specialEvents.type,
  title: specialEvents.title,
  startDate: specialEvents.startDate,
  endDate: specialEvents.endDate,
  startTime: specialEvents.startTime,
  notes: specialEvents.notes,
  speakerName: specialEvents.speakerName,
  midweekTheme: specialEvents.midweekTheme,
  publicTalkTheme: specialEvents.publicTalkTheme,
  finalTalkTheme: specialEvents.finalTalkTheme,
};

const legacyEventColumns = {
  id: specialEvents.id,
  type: specialEvents.type,
  title: specialEvents.title,
  startDate: specialEvents.startDate,
  endDate: specialEvents.endDate,
  startTime: specialEvents.startTime,
  notes: specialEvents.notes,
};

function isMissingVisitColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("speaker_name") ||
    message.includes("midweek_theme") ||
    message.includes("public_talk_theme") ||
    message.includes("final_talk_theme")
  );
}

async function selectSpecialEvents(): Promise<SpecialEventItem[]> {
  const db = getDb();
  try {
    const rows = await db
      .select(specialEventColumns)
      .from(specialEvents)
      .orderBy(asc(specialEvents.startDate));
    return rows as SpecialEventItem[];
  } catch (error) {
    if (!isMissingVisitColumnError(error)) {
      // Banco inacessível: semana sem avisos em vez de quebrar a página.
      console.error("[settings] falha ao ler special_events", error);
      return [];
    }
    try {
      // Banco ainda sem a migração 0009: lê sem as colunas da visita.
      const rows = await db
        .select(legacyEventColumns)
        .from(specialEvents)
        .orderBy(asc(specialEvents.startDate));
      return (
        rows as Omit<
          SpecialEventItem,
          "speakerName" | "midweekTheme" | "publicTalkTheme" | "finalTalkTheme"
        >[]
      ).map((row) => ({
        ...row,
        speakerName: null,
        midweekTheme: null,
        publicTalkTheme: null,
        finalTalkTheme: null,
      }));
    } catch (legacyError) {
      console.error("[settings] falha ao ler special_events", legacyError);
      return [];
    }
  }
}

export async function listSpecialEvents(): Promise<SpecialEventItem[]> {
  await requirePrivilegedUser();
  return selectSpecialEvents();
}

/** Eventos para os avisos do programa: dado congregacional público, sem papel exigido. */
export async function listPublicSpecialEvents(): Promise<SpecialEventItem[]> {
  return selectSpecialEvents();
}

export interface ScheduleExceptionItem {
  id: string;
  type: ScheduleExceptionType;
  date: string;
  notes: string | null;
}

export async function listScheduleExceptions(): Promise<ScheduleExceptionItem[]> {
  await requirePrivilegedUser();
  const rows = await getDb()
    .select({
      id: scheduleExceptions.id,
      type: scheduleExceptions.type,
      date: scheduleExceptions.date,
      notes: scheduleExceptions.notes,
    })
    .from(scheduleExceptions)
    .orderBy(desc(scheduleExceptions.date));
  return rows as ScheduleExceptionItem[];
}

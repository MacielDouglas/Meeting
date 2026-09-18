import { asc, desc, eq } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/features/auth/application/session";
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

export async function getMeetingSchedule(): Promise<MeetingSchedule> {
  const rows = await getDb()
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
    midweekDay: toWeekDay(row.midweekDay),
    midweekTime: row.midweekTime,
    weekendDay: toWeekDay(row.weekendDay),
    weekendTime: row.weekendTime,
  };
}

export interface SpecialEventItem {
  id: string;
  type: SpecialEventType;
  title: string;
  startDate: string;
  endDate: string | null;
  startTime: string;
  notes: string | null;
}

export async function listSpecialEvents(): Promise<SpecialEventItem[]> {
  await requireAuthenticatedUser();
  const rows = await getDb()
    .select({
      id: specialEvents.id,
      type: specialEvents.type,
      title: specialEvents.title,
      startDate: specialEvents.startDate,
      endDate: specialEvents.endDate,
      startTime: specialEvents.startTime,
      notes: specialEvents.notes,
    })
    .from(specialEvents)
    .orderBy(asc(specialEvents.startDate));
  return rows as SpecialEventItem[];
}

export interface ScheduleExceptionItem {
  id: string;
  type: ScheduleExceptionType;
  date: string;
  notes: string | null;
}

export async function listScheduleExceptions(): Promise<ScheduleExceptionItem[]> {
  await requireAuthenticatedUser();
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

import { listPersonCleaningInRange } from "@/features/cleaning/application/cleaning-program-queries";
import { getMeetingProgram } from "@/features/meetings/application/meeting-queries";
import { getPersonByUserId } from "@/features/people/application/queries";
import { getWeeklySchedule } from "@/features/weekly-schedule/application/get-weekly-schedule";
import type { MyWeek, MyWeekMeeting } from "@/features/weekly-schedule/domain/my-week";
import { selectInitialKind } from "@/features/weekly-schedule/domain/schedule";
import { todayLocalISO } from "@/shared/lib/format-date";

/**
 * "Mi semana" de la página inicial: reuniones de la semana principal con las
 * designaciones de la persona vinculada al usuario (partes + limpieza),
 * próxima reunión en primer lugar. Sin persona vinculada, devuelve solo las
 * reuniones.
 */
export async function getMyWeek(userId: string, reference: Date = new Date()): Promise<MyWeek> {
  const [person, schedule] = await Promise.all([
    getPersonByUserId(userId),
    getWeeklySchedule(reference),
  ]);

  if (!person) {
    return {
      weekStart: schedule.weekStart,
      weekEnd: schedule.weekEnd,
      personName: null,
      isMale: false,
      meetings: orderMeetings(schedule, null, null, [], "midweek"),
    };
  }

  const personName = `${person.firstName} ${person.lastName}`.trim();
  const [midweekProgram, weekendProgram, cleaning] = await Promise.all([
    getMeetingProgram("midweek", schedule.weekStart).catch(() => null),
    getMeetingProgram("weekend", schedule.weekStart).catch(() => null),
    listPersonCleaningInRange(person.id, schedule.weekStart, schedule.weekEnd).catch(() => []),
  ]);

  return {
    weekStart: schedule.weekStart,
    weekEnd: schedule.weekEnd,
    personName,
    isMale: person.sex === "male",
    meetings: orderMeetings(
      schedule,
      midweekProgram?.assignments ?? null,
      weekendProgram?.assignments ?? null,
      cleaning,
      selectInitialKind(todayLocalISO(reference), schedule.midweek.date),
      person.id,
    ),
  };
}

interface ProgramAssignment {
  partKey: string;
  section: string;
  title: string;
  durationMinutes: number;
  songNumber: number | null;
  personId: string | null;
  personName: string;
  helperPersonId: string | null;
  helperPersonName: string;
}

interface ScheduleLike {
  weekStart: string;
  weekEnd: string;
  midweek: { date: string; time: string };
  weekend: { date: string; time: string };
}

function orderMeetings(
  schedule: ScheduleLike,
  midweekAssignments: ProgramAssignment[] | null,
  weekendAssignments: ProgramAssignment[] | null,
  cleaning: { assignmentDate: string; sectorName: string; isFamily: boolean }[],
  nextKind: "midweek" | "weekend",
  personId?: string,
): MyWeekMeeting[] {
  const build = (
    kind: "midweek" | "weekend",
    title: string,
    date: string,
    time: string,
    assignments: ProgramAssignment[] | null,
  ): MyWeekMeeting => ({
    kind,
    title,
    date,
    time,
    isNext: kind === nextKind,
    parts: (assignments ?? [])
      .filter((a) => personId != null && (a.personId === personId || a.helperPersonId === personId))
      .map((a) => ({
        partKey: a.partKey,
        section: a.section,
        title: a.title,
        durationMinutes: a.durationMinutes,
        songNumber: a.songNumber,
        isHelper: a.helperPersonId === personId,
        personName: a.personName,
        helperPersonName: a.helperPersonName,
      })),
    cleaning: cleaning.filter((c) => c.assignmentDate === date),
  });

  const midweek = build(
    "midweek",
    "Reunión entre semana",
    schedule.midweek.date,
    schedule.midweek.time,
    midweekAssignments,
  );
  const weekend = build(
    "weekend",
    "Reunión de fin de semana",
    schedule.weekend.date,
    schedule.weekend.time,
    weekendAssignments,
  );
  return nextKind === "midweek" ? [midweek, weekend] : [weekend, midweek];
}

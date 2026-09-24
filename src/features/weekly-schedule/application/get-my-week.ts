import { listPersonCleaningInRange } from "@/features/cleaning/application/cleaning-program-queries";
import {
  listPersonDutiesInRange,
  listUpcomingPersonDuties,
} from "@/features/meeting-duties/application/duty-queries";
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
      meetings: orderMeetings(schedule, null, null, [], [], "midweek"),
      upcomingDuties: [],
    };
  }

  const personName = `${person.firstName} ${person.lastName}`.trim();
  const today = todayLocalISO(reference);
  // Apoio En la reunión só existe para homens: economiza as queries para os demais.
  const [midweekProgram, weekendProgram, cleaning, duties, upcomingDuties] = await Promise.all([
    getMeetingProgram("midweek", schedule.weekStart).catch(() => null),
    getMeetingProgram("weekend", schedule.weekStart).catch(() => null),
    listPersonCleaningInRange(person.id, schedule.weekStart, schedule.weekEnd).catch(() => []),
    person.sex === "male"
      ? listPersonDutiesInRange(person.id, schedule.weekStart, schedule.weekEnd).catch(() => [])
      : Promise.resolve([]),
    person.sex === "male"
      ? listUpcomingPersonDuties(person.id, today).catch(() => [])
      : Promise.resolve([]),
  ]);

  const meetings = orderMeetings(
    schedule,
    midweekProgram?.assignments ?? null,
    weekendProgram?.assignments ?? null,
    cleaning,
    duties,
    selectInitialKind(today, schedule.midweek.date),
    person.id,
  );
  const shownDates = new Set(meetings.map((meeting) => meeting.date));

  return {
    weekStart: schedule.weekStart,
    weekEnd: schedule.weekEnd,
    personName,
    isMale: person.sex === "male",
    meetings,
    upcomingDuties: upcomingDuties.filter((duty) => !shownDates.has(duty.assignmentDate)),
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
  midweek: { date: string; time: string; location: string };
  weekend: { date: string; time: string; location: string };
}

function orderMeetings(
  schedule: ScheduleLike,
  midweekAssignments: ProgramAssignment[] | null,
  weekendAssignments: ProgramAssignment[] | null,
  cleaning: { assignmentDate: string; sectorName: string; isFamily: boolean }[],
  duties: {
    assignmentDate: string;
    dutyKey: string;
    postLabel: string;
    side: string | null;
    sortOrder: number;
  }[],
  nextKind: "midweek" | "weekend",
  personId?: string,
): MyWeekMeeting[] {
  const build = (
    kind: "midweek" | "weekend",
    title: string,
    date: string,
    time: string,
    location: string,
    assignments: ProgramAssignment[] | null,
  ): MyWeekMeeting => ({
    kind,
    title,
    date,
    time,
    location,
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
    duties: duties.filter((d) => d.assignmentDate === date),
  });

  const midweek = build(
    "midweek",
    "Reunión entre semana",
    schedule.midweek.date,
    schedule.midweek.time,
    schedule.midweek.location,
    midweekAssignments,
  );
  const weekend = build(
    "weekend",
    "Reunión de fin de semana",
    schedule.weekend.date,
    schedule.weekend.time,
    schedule.weekend.location,
    weekendAssignments,
  );
  return nextKind === "midweek" ? [midweek, weekend] : [weekend, midweek];
}

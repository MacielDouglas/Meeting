import type { CleaningTypeKey } from "@/features/cleaning/domain/cleaning-defaults";
import type {
  ScheduleExceptionItem,
  SpecialEventItem,
} from "@/features/settings/application/queries";

export interface AssignmentInput {
  typeKey: CleaningTypeKey;
  startDate: string;
  endDate: string;
  sectors: { key: string; name: string; peopleCount: number | null; requiredSex: string }[];
  persons: {
    id: string;
    firstName: string;
    lastName: string;
    sex: "male" | "female";
    cleaning: boolean;
    familyHead: boolean;
    familyMemberId: string | null;
  }[];
  midweekDay: number;
  weekendDay: number;
  specialEvents: SpecialEventItem[];
  scheduleExceptions: ScheduleExceptionItem[];
}

export interface GeneratedAssignment {
  assignmentDate: string;
  sectorKey: string;
  sectorName: string;
  personId: string | null;
  personName: string;
  isFamily: boolean;
  sortOrder: number;
}

export interface DayInfo {
  date: string;
  isMidweek: boolean;
  isWeekend: boolean;
  assemblyType: string | null;
  celebrationReplacement: boolean;
}

const ASSEMBLY_TYPES = [
  "regional_assembly",
  "circuit_assembly",
  "representative_assembly",
] as const;

const ASSEMBLY_LABELS: Record<string, string> = {
  regional_assembly: "Assembleia Regional",
  circuit_assembly: "Assembleia com Viajante",
  representative_assembly: "Assembleia com Representante",
};

function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function _getDayOfWeek(dateStr: string): number {
  return parseISODate(dateStr).getUTCDay();
}

function _isDateInRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

function findAssemblyForWeek(
  weekStart: string,
  weekEnd: string,
  events: SpecialEventItem[],
): string | null {
  for (const event of events) {
    if (!ASSEMBLY_TYPES.includes(event.type as (typeof ASSEMBLY_TYPES)[number])) continue;
    const eventStart = event.startDate;
    const eventEnd = event.endDate ?? event.startDate;
    if (eventStart <= weekEnd && eventEnd >= weekStart) {
      return ASSEMBLY_LABELS[event.type] ?? event.type;
    }
  }
  return null;
}

function findCelebrationForDate(
  dateStr: string,
  events: SpecialEventItem[],
): SpecialEventItem | null {
  for (const event of events) {
    if (event.type !== "memorial") continue;
    const eventStart = event.startDate;
    const eventEnd = event.endDate ?? event.startDate;
    if (dateStr >= eventStart && dateStr <= eventEnd) return event;
  }
  return null;
}

function isExceptionNoMeeting(dateStr: string, exceptions: ScheduleExceptionItem[]): boolean {
  return exceptions.some((ex) => ex.date === dateStr && ex.type === "no_meeting");
}

function getWeekStart(dateStr: string, midweekDay: number): string {
  const date = parseISODate(dateStr);
  const dayOfWeek = date.getUTCDay();
  const diff = (dayOfWeek - midweekDay + 7) % 7;
  const weekStartDate = addDays(date, -diff);
  return toISODate(weekStartDate);
}

function getWeekEnd(dateStr: string, midweekDay: number): string {
  const weekStart = getWeekStart(dateStr, midweekDay);
  return toISODate(addDays(parseISODate(weekStart), 6));
}

export function analyzeDays(input: AssignmentInput): DayInfo[] {
  const { startDate, endDate, midweekDay, weekendDay, specialEvents, scheduleExceptions } = input;
  const days: DayInfo[] = [];
  let current = parseISODate(startDate);
  const end = parseISODate(endDate);

  while (current <= end) {
    const dateStr = toISODate(current);
    const dayOfWeek = current.getUTCDay();
    const isMidweek = dayOfWeek === midweekDay;
    const isWeekend = dayOfWeek === weekendDay;

    let assemblyType: string | null = null;
    let celebrationReplacement = false;

    if (isMidweek || isWeekend) {
      const weekStart = getWeekStart(dateStr, midweekDay);
      const weekEnd = getWeekEnd(dateStr, midweekDay);
      assemblyType = findAssemblyForWeek(weekStart, weekEnd, specialEvents);

      if (!assemblyType) {
        const celebration = findCelebrationForDate(dateStr, specialEvents);
        if (celebration) {
          celebrationReplacement = true;
        }
        if (isExceptionNoMeeting(dateStr, scheduleExceptions)) {
          assemblyType = "Sem reunião (exceção)";
        }
      }
    }

    days.push({ date: dateStr, isMidweek, isWeekend, assemblyType, celebrationReplacement });
    current = addDays(current, 1);
  }

  return days;
}

export function generateCleaningAssignments(input: AssignmentInput): {
  assignments: GeneratedAssignment[];
  messages: { date: string; message: string }[];
} {
  const { sectors, persons } = input;
  const days = analyzeDays(input);
  const assignments: GeneratedAssignment[] = [];
  const messages: { date: string; message: string }[] = [];

  const personLastAssignment = new Map<string, string>();
  const personSectorCount = new Map<string, Map<string, number>>();

  for (const person of persons) {
    if (person.familyMemberId) {
      personLastAssignment.set(person.id, person.familyMemberId);
    }
  }

  function isEligible(p: (typeof persons)[number], requiredSex: string): boolean {
    if (!p.cleaning) return false;
    if (requiredSex === "male" && p.sex !== "male") return false;
    if (requiredSex === "female" && p.sex !== "female") return false;
    return true;
  }

  function assignPerson(
    p: (typeof persons)[number],
    date: string,
    sectorKey: string,
    sectorName: string,
    isFam: boolean,
  ): void {
    assignments.push({
      assignmentDate: date,
      sectorKey,
      sectorName,
      personId: p.id,
      personName: `${p.firstName} ${p.lastName}`,
      isFamily: isFam,
      sortOrder: assignments.length,
    });
    if (!personSectorCount.has(p.id)) personSectorCount.set(p.id, new Map());
    personSectorCount
      .get(p.id)
      ?.set(sectorKey, (personSectorCount.get(p.id)?.get(sectorKey) ?? 0) + 1);
    personLastAssignment.set(p.id, date);
  }

  function getLastDate(pid: string): string {
    return personLastAssignment.get(pid) ?? "";
  }

  function getSectorCount(pid: string, sk: string): number {
    return personSectorCount.get(pid)?.get(sk) ?? 0;
  }

  for (const day of days) {
    if (day.assemblyType && !day.celebrationReplacement) {
      messages.push({ date: day.date, message: `${day.assemblyType} — semana sem reunião` });
      continue;
    }

    if (!day.isMidweek && !day.isWeekend) continue;

    const dayUsed = new Set<string>();

    for (const sector of sectors) {
      const neededCount = sector.peopleCount ?? 2;
      let assigned = 0;

      const candidates = persons
        .filter((p) => !dayUsed.has(p.id) && isEligible(p, sector.requiredSex))
        .map((p) => ({
          person: p,
          lastDate: getLastDate(p.id),
          sectorCount: getSectorCount(p.id, sector.key),
        }))
        .sort((a, b) => {
          const ac = a.sectorCount - b.sectorCount;
          if (ac !== 0) return ac;
          return a.lastDate.localeCompare(b.lastDate);
        });

      for (const c of candidates) {
        if (assigned >= neededCount) break;
        if (dayUsed.has(c.person.id)) continue;

        const isHead = c.person.familyHead && !c.person.familyMemberId;
        if (isHead) {
          const members = persons.filter(
            (m) =>
              m.familyMemberId === c.person.id &&
              m.id !== c.person.id &&
              m.cleaning &&
              !dayUsed.has(m.id) &&
              isEligible(m, sector.requiredSex),
          );
          const slotsAvailable = neededCount - assigned;
          const fittingMembers = members.slice(0, slotsAvailable - 1);

          assignPerson(c.person, day.date, sector.key, sector.name, false);
          dayUsed.add(c.person.id);
          assigned++;

          for (const m of fittingMembers) {
            assignPerson(m, day.date, sector.key, sector.name, true);
            dayUsed.add(m.id);
            assigned++;
          }
        } else {
          assignPerson(c.person, day.date, sector.key, sector.name, false);
          dayUsed.add(c.person.id);
          assigned++;
        }
      }
    }
  }

  return { assignments, messages };
}

export function validateWeeklyConstraint(selectedDates: string[]): {
  valid: boolean;
  error?: string;
} {
  const weekGroups = new Map<string, string[]>();
  for (const date of selectedDates) {
    const weekStart = getWeekStart(date, 2);
    if (!weekGroups.has(weekStart)) weekGroups.set(weekStart, []);
    weekGroups.get(weekStart)?.push(date);
  }
  for (const [week, dates] of weekGroups) {
    if (dates.length > 1) {
      return {
        valid: false,
        error: `Semana de ${week}: não é possível programar mais de um dia para limpeza semanal.`,
      };
    }
  }
  return { valid: true };
}

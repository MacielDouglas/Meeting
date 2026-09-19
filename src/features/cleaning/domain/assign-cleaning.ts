import {
  CLEANING_DEFAULT_PEOPLE_PER_SECTOR,
  CLEANING_SCORE_RECENCY_DAYS,
  CLEANING_SCORE_SECTOR_WEIGHT,
  CLEANING_SCORE_TOTAL_WEIGHT,
} from "@/features/cleaning/domain/cleaning-constants";
import type { CleaningTypeKey } from "@/features/cleaning/domain/cleaning-defaults";
import type {
  ScheduleExceptionItem,
  SpecialEventItem,
} from "@/features/settings/application/queries";

export interface AssignmentInput {
  typeKey: CleaningTypeKey;
  startDate: string;
  endDate: string;
  sectors: {
    key: string;
    name: string;
    peopleCount: number | null;
    requiredSex: string;
    allowYoung: boolean;
  }[];
  persons: {
    id: string;
    firstName: string;
    lastName: string;
    sex: "male" | "female";
    cleaning: boolean;
    young: boolean;
    familyHead: boolean;
    familyMemberId: string | null;
  }[];
  midweekDay: number;
  weekendDay: number;
  specialEvents: SpecialEventItem[];
  scheduleExceptions: ScheduleExceptionItem[];
  history?: {
    totalByPerson: Record<string, number>;
    sectorByPerson: Record<string, Record<string, number>>;
    lastDateByPerson: Record<string, string>;
    /** Todas as datas trabalhadas por pessoa (90 dias + futuras/draft). */
    datesByPerson?: Record<string, string[]>;
  };
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

/** Segunda-feira (seg-dom) da semana da data — base do descanso semanal. */
function weekKeyOf(dateStr: string): string {
  const date = parseISODate(dateStr);
  const dow = date.getUTCDay();
  const diff = (dow + 6) % 7;
  return toISODate(addDays(date, -diff));
}

function daysBetween(fromStr: string, toStr: string): number {
  const ms = parseISODate(toStr).getTime() - parseISODate(fromStr).getTime();
  return Math.round(ms / 86400000);
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
  const { sectors, persons, history } = input;
  const days = analyzeDays(input);
  const assignments: GeneratedAssignment[] = [];
  const messages: { date: string; message: string }[] = [];

  // Fairness global (espelha AssignmentHub): semeia contadores com histórico de 90 dias
  // + designações futuras (drafts ainda não realizados também contam).
  const personLastAssignment = new Map<string, string>();
  const personTotalCount = new Map<string, number>();
  const personSectorCount = new Map<string, Map<string, number>>();
  const personWorkedDates = new Map<string, Set<string>>();

  if (history) {
    for (const [pid, total] of Object.entries(history.totalByPerson)) {
      personTotalCount.set(pid, total);
    }
    for (const [pid, bySector] of Object.entries(history.sectorByPerson)) {
      personSectorCount.set(pid, new Map(Object.entries(bySector)));
    }
    for (const [pid, lastDate] of Object.entries(history.lastDateByPerson)) {
      personLastAssignment.set(pid, lastDate);
    }
    for (const [pid, dates] of Object.entries(history.datesByPerson ?? {})) {
      personWorkedDates.set(pid, new Set(dates));
    }
  }

  function isEligible(
    p: (typeof persons)[number],
    requiredSex: string,
    allowYoung: boolean,
    relaxYoung: boolean,
  ): boolean {
    if (!p.cleaning) return false;
    if (requiredSex === "male" && p.sex !== "male") return false;
    if (requiredSex === "female" && p.sex !== "female") return false;
    if (!allowYoung && p.young && !relaxYoung) return false;
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
    personTotalCount.set(p.id, (personTotalCount.get(p.id) ?? 0) + 1);
    if (!personSectorCount.has(p.id)) personSectorCount.set(p.id, new Map());
    personSectorCount
      .get(p.id)
      ?.set(sectorKey, (personSectorCount.get(p.id)?.get(sectorKey) ?? 0) + 1);
    personLastAssignment.set(p.id, date);
    if (!personWorkedDates.has(p.id)) personWorkedDates.set(p.id, new Set());
    personWorkedDates.get(p.id)?.add(date);
  }

  function getLastDate(pid: string): string {
    return personLastAssignment.get(pid) ?? "";
  }

  function getTotalCount(pid: string): number {
    return personTotalCount.get(pid) ?? 0;
  }

  function getSectorCount(pid: string, sk: string): number {
    return personSectorCount.get(pid)?.get(sk) ?? 0;
  }

  function hasWorkedInWeek(pid: string, dateStr: string): boolean {
    const week = weekKeyOf(dateStr);
    const dates = personWorkedDates.get(pid);
    if (!dates) return false;
    for (const d of dates) {
      if (weekKeyOf(d) === week) return true;
    }
    return false;
  }

  /**
   * Score ponderado (espelha AssignmentHub): ver pesos em `cleaning-constants.ts`.
   * Cada dia gerado atualiza os contadores, então a decisão do dia N considera
   * os dias 1..N-1 da mesma geração, além dos 90 dias + futuros do histórico.
   */
  function personScore(pid: string, sectorKey: string, today: string): number {
    const total = getTotalCount(pid);
    const onSector = getSectorCount(pid, sectorKey);
    const last = getLastDate(pid);
    let recency = 0;
    if (last) {
      recency = Math.max(0, CLEANING_SCORE_RECENCY_DAYS - daysBetween(last, today));
    }
    return total * CLEANING_SCORE_TOTAL_WEIGHT + onSector * CLEANING_SCORE_SECTOR_WEIGHT + recency;
  }

  // Setores restritivos primeiro (espelha AssignmentHub): sexo específico, depois só-adulto.
  const orderedSectors = [...sectors].sort((a, b) => {
    const aSex = a.requiredSex !== "any" ? 0 : 1;
    const bSex = b.requiredSex !== "any" ? 0 : 1;
    if (aSex !== bSex) return aSex - bSex;
    const aYoung = a.allowYoung ? 1 : 0;
    const bYoung = b.allowYoung ? 1 : 0;
    if (aYoung !== bYoung) return aYoung - bYoung;
    return (
      (b.peopleCount ?? CLEANING_DEFAULT_PEOPLE_PER_SECTOR) -
      (a.peopleCount ?? CLEANING_DEFAULT_PEOPLE_PER_SECTOR)
    );
  });
  let prevSessionDate: string | null = null;
  const byId = new Map(persons.map((p) => [p.id, p]));

  /** Chefe poderia entrar neste setor (ignora descansos, que são flexíveis)? */
  function headCouldJoin(
    headId: string,
    requiredSex: string,
    allowYoung: boolean,
    relaxYoung: boolean,
  ): boolean {
    const head = byId.get(headId);
    if (!head) return false;
    if (!head.cleaning) return false;
    if (requiredSex === "male" && head.sex !== "male") return false;
    if (requiredSex === "female" && head.sex !== "female") return false;
    if (!allowYoung && head.young && !relaxYoung) return false;
    return true;
  }

  for (const day of days) {
    if (day.assemblyType && !day.celebrationReplacement) {
      messages.push({ date: day.date, message: `${day.assemblyType} — semana sem reunião` });
      continue;
    }

    if (!day.isMidweek && !day.isWeekend) continue;

    const dayUsed = new Set<string>();

    for (const sector of orderedSectors) {
      const neededCount = sector.peopleCount ?? CLEANING_DEFAULT_PEOPLE_PER_SECTOR;
      let assigned = 0;
      let usedYoungFallback = false;
      let usedWeeklyDouble = false;
      let usedRepeatPrev = false;

      // Ordem das passadas: descanso da sessão anterior e descanso semanal são
      // relaxados antes do jovem; jovem em setor só-adulto é o último recurso.
      // 1) tudo respeitado 2) repete sessão anterior 3) repete na semana
      // 4) repete ambos — depois as mesmas 4 com jovem liberado.
      const passes = [
        { enforceRest: true, enforceWeekly: true, relaxYoung: false },
        { enforceRest: false, enforceWeekly: true, relaxYoung: false },
        { enforceRest: true, enforceWeekly: false, relaxYoung: false },
        { enforceRest: false, enforceWeekly: false, relaxYoung: false },
        { enforceRest: true, enforceWeekly: true, relaxYoung: true },
        { enforceRest: false, enforceWeekly: true, relaxYoung: true },
        { enforceRest: true, enforceWeekly: false, relaxYoung: true },
        { enforceRest: false, enforceWeekly: false, relaxYoung: true },
      ];

      for (const pass of passes) {
        if (assigned >= neededCount) break;
        // Setores que permitem jovem não precisam das passadas de fallback.
        if (sector.allowYoung && pass.relaxYoung) continue;

        const candidates = persons
          .filter((p) => {
            if (dayUsed.has(p.id)) return false;
            if (!isEligible(p, sector.requiredSex, sector.allowYoung, pass.relaxYoung)) {
              return false;
            }
            if (pass.enforceRest && prevSessionDate && getLastDate(p.id) === prevSessionDate) {
              return false;
            }
            if (pass.enforceWeekly && hasWorkedInWeek(p.id, day.date)) return false;
            // Membro de família espera o chefe: só entra sozinho se o chefe já foi
            // usado hoje ou se o chefe não poderia entrar neste setor.
            if (
              p.familyMemberId &&
              !dayUsed.has(p.familyMemberId) &&
              headCouldJoin(
                p.familyMemberId,
                sector.requiredSex,
                sector.allowYoung,
                pass.relaxYoung,
              )
            ) {
              return false;
            }
            return true;
          })
          .map((p) => ({ person: p, score: personScore(p.id, sector.key, day.date) }))
          .sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score;
            return `${a.person.firstName} ${a.person.lastName}`.localeCompare(
              `${b.person.firstName} ${b.person.lastName}`,
            );
          });

        for (const c of candidates) {
          if (assigned >= neededCount) break;
          if (dayUsed.has(c.person.id)) continue;

          const isHead = c.person.familyHead && !c.person.familyMemberId;
          if (isHead) {
            const members = persons
              .filter(
                (m) =>
                  m.familyMemberId === c.person.id &&
                  m.id !== c.person.id &&
                  m.cleaning &&
                  !dayUsed.has(m.id) &&
                  isEligible(m, sector.requiredSex, sector.allowYoung, pass.relaxYoung) &&
                  (!pass.enforceRest ||
                    !prevSessionDate ||
                    getLastDate(m.id) !== prevSessionDate) &&
                  (!pass.enforceWeekly || !hasWorkedInWeek(m.id, day.date)),
              )
              .sort(
                (a, b) =>
                  personScore(a.id, sector.key, day.date) - personScore(b.id, sector.key, day.date),
              );
            // Família atômica no setor: entra inteira ou não entra (não divide o
            // núcleo entre setores). Se não couber, pula para o próximo candidato.
            const slotsAvailable = neededCount - assigned;
            if (1 + members.length > slotsAvailable) continue;

            const headWorkedPrev =
              !!prevSessionDate && getLastDate(c.person.id) === prevSessionDate;
            const headDoubledWeek = hasWorkedInWeek(c.person.id, day.date);
            assignPerson(c.person, day.date, sector.key, sector.name, false);
            dayUsed.add(c.person.id);
            assigned++;
            if (!pass.enforceRest && headWorkedPrev) usedRepeatPrev = true;
            if (!pass.enforceWeekly && headDoubledWeek) usedWeeklyDouble = true;

            for (const m of members.slice(0, slotsAvailable - 1)) {
              const memberWorkedPrev = !!prevSessionDate && getLastDate(m.id) === prevSessionDate;
              const memberDoubledWeek = hasWorkedInWeek(m.id, day.date);
              assignPerson(m, day.date, sector.key, sector.name, true);
              dayUsed.add(m.id);
              assigned++;
              if (!pass.enforceRest && memberWorkedPrev) usedRepeatPrev = true;
              if (!pass.enforceWeekly && memberDoubledWeek) usedWeeklyDouble = true;
            }
          } else {
            const workedPrev = !!prevSessionDate && getLastDate(c.person.id) === prevSessionDate;
            const doubledWeek = hasWorkedInWeek(c.person.id, day.date);
            assignPerson(c.person, day.date, sector.key, sector.name, false);
            dayUsed.add(c.person.id);
            assigned++;
            if (!pass.enforceRest && workedPrev) usedRepeatPrev = true;
            if (!pass.enforceWeekly && doubledWeek) usedWeeklyDouble = true;
          }

          if (pass.relaxYoung && c.person.young && !sector.allowYoung) {
            usedYoungFallback = true;
          }
        }
      }

      if (assigned < neededCount) {
        messages.push({
          date: day.date,
          message: `${sector.name}: ${assigned}/${neededCount} designados (faltou gente elegível)`,
        });
      } else {
        if (usedYoungFallback) {
          messages.push({
            date: day.date,
            message: `${sector.name}: jovem escalado em setor só-adulto (faltou adulto)`,
          });
        }
        if (usedWeeklyDouble) {
          messages.push({
            date: day.date,
            message: `${sector.name}: alguém repetido na mesma semana (faltou gente descansada)`,
          });
        } else if (usedRepeatPrev) {
          messages.push({
            date: day.date,
            message: `${sector.name}: alguém repetido da sessão anterior (faltou gente descansada)`,
          });
        }
      }
    }

    prevSessionDate = day.date;
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

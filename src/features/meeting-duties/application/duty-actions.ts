"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requirePrivilegedUser } from "@/features/auth/application/session";
import { analyzeDays } from "@/features/cleaning/domain/assign-cleaning";
import { listEnabledDesignationSectors } from "@/features/designations/application/queries";
import {
  listActiveDutyDates,
  listDutyEligiblePersons,
  listPersonDutyHistory,
} from "@/features/meeting-duties/application/duty-queries";
import {
  buildDutyRoster,
  type DutyDate,
  type DutyKey,
  type DutySectorConfig,
} from "@/features/meeting-duties/domain/build-duty-roster";
import {
  dutyAssignments,
  dutyPrograms,
} from "@/features/meeting-duties/infrastructure/duty-schema";
import { getMeetingProgram } from "@/features/meetings/application/meeting-queries";
import { persons } from "@/features/people/infrastructure/person-schema";
import {
  getMeetingSchedule,
  listScheduleExceptions,
  listSpecialEvents,
} from "@/features/settings/application/queries";
import { getDb } from "@/shared/lib/db";

export interface DutyCandidate {
  id: string;
  name: string;
}

export interface DutyDraftSlot {
  dutyKey: string;
  dutyName: string;
  postLabel: string;
  side: string | null;
  personId: string | null;
  candidates: DutyCandidate[];
  /** Candidatos que servem no programa da data (aviso, manual libera). */
  conflictIds: string[];
}

export interface DutyDraftDate {
  date: string;
  kind: "midweek" | "weekend";
  slots: DutyDraftSlot[];
  programConflictNames: string[];
}

/** Ordem canônica da escala En la reunión: acomodadores, microfones, som, vídeo, plataforma. */
const DUTY_KEYS: DutyKey[] = ["usher", "microphone", "sound", "video", "platform"];

const DUTY_TABLES_MISSING_ERROR =
  "Tablas de designaciones no creadas en la base de datos. Ejecuta `npm run db:push` y recarga la página.";

function isMissingTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("duty_programs") ||
    message.includes("duty_assignments") ||
    message.includes("does not exist")
  );
}

/** Segunda-feira (ISO) da semana da data — chave do programa que cobre a reunião. */
function mondayOfISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const diff = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - diff);
  return dt.toISOString().slice(0, 10);
}

function toSectorConfig(
  sectors: Awaited<ReturnType<typeof listEnabledDesignationSectors>>,
): DutySectorConfig[] {
  const byFlag = new Map(sectors.map((s) => [s.personFlag, s]));
  return DUTY_KEYS.flatMap((key) => {
    const sector = byFlag.get(key);
    if (!sector) return [];
    return [
      {
        key,
        name: sector.name,
        enabled: sector.enabled,
        peopleCount: sector.peopleCount,
        slots: sector.slots.map((s) => s.label),
      },
    ];
  });
}

interface GenerateResult {
  ok: boolean;
  error?: string;
  draft?: DutyDraftDate[];
  programMissingDates?: string[];
}

export async function generateDutyRoster(
  rangeStart: string,
  rangeEnd: string,
): Promise<GenerateResult> {
  await requirePrivilegedUser();
  if (!rangeStart || !rangeEnd) return { ok: false, error: "Indica las fechas inicial y final." };
  if (rangeStart > rangeEnd) {
    return { ok: false, error: "La fecha inicial debe ser anterior a la fecha final." };
  }

  const [meetingSchedule, specialEvents, scheduleExceptions, sectors, people, history] =
    await Promise.all([
      getMeetingSchedule(),
      listSpecialEvents(),
      listScheduleExceptions(),
      listEnabledDesignationSectors(),
      listDutyEligiblePersons(),
      listPersonDutyHistory(),
    ]);

  const days = analyzeDays({
    typeKey: "per_meeting",
    startDate: rangeStart,
    endDate: rangeEnd,
    sectors: [],
    persons: [],
    midweekDay: meetingSchedule.midweekDay,
    weekendDay: meetingSchedule.weekendDay,
    specialEvents,
    scheduleExceptions,
  });
  const meetingDays: DutyDate[] = days
    .filter((d) => (d.isMidweek || d.isWeekend) && !d.assemblyType && !d.celebrationReplacement)
    .map((d) => ({ date: d.date, kind: d.isMidweek ? "midweek" : "weekend" }));
  if (meetingDays.length === 0) {
    return { ok: false, error: "No hay días de reunión en el período elegido." };
  }

  // Conflitos por parte do programa (manual libera):
  // - presidente (entre semana): fora de tudo na data;
  // - dirigente + leitor do estudo (entre semana: estudo bíblico; fim de
  //   semana: Atalaya): fora só do microfone volante.
  const excludedByDate = new Map<string, Set<string>>();
  const micExcludedByDate = new Map<string, Set<string>>();
  const conflictNamesByDate = new Map<string, string[]>();
  const programMissingDates: string[] = [];
  const weeks = [...new Set(meetingDays.map((d) => mondayOfISO(d.date)))];
  for (const weekStart of weeks) {
    const [midweekProgram, weekendProgram] = await Promise.all([
      getMeetingProgram("midweek", weekStart).catch(() => null),
      getMeetingProgram("weekend", weekStart).catch(() => null),
    ]);
    for (const day of meetingDays.filter((d) => mondayOfISO(d.date) === weekStart)) {
      const program = day.kind === "midweek" ? midweekProgram : weekendProgram;
      if (!program) {
        programMissingDates.push(day.date);
        continue;
      }
      const studyKey = day.kind === "midweek" ? "congregation-study" : "watchtower-study";
      const all = new Set<string>();
      const micOnly = new Set<string>();
      const namesById = new Map<string, string>();
      for (const assignment of program.assignments) {
        const people: [string | null, string][] = [
          [assignment.personId, assignment.personName],
          [assignment.helperPersonId, assignment.helperPersonName],
        ];
        for (const [id, name] of people) {
          if (!id) continue;
          if (name) namesById.set(id, name);
          if (assignment.partKey === "president" && day.kind === "midweek") all.add(id);
          else if (assignment.partKey === studyKey) micOnly.add(id);
        }
      }
      excludedByDate.set(day.date, all);
      micExcludedByDate.set(day.date, micOnly);
      conflictNamesByDate.set(
        day.date,
        [...all, ...micOnly].map((id) => namesById.get(id) ?? "").filter(Boolean),
      );
    }
  }

  const sectorConfig = toSectorConfig(sectors);
  const draft = buildDutyRoster(
    meetingDays,
    sectorConfig,
    people.map((p) => ({ id: p.id, name: p.name, sex: p.sex, flags: p.flags })),
    history,
    excludedByDate,
    micExcludedByDate,
  );

  const candidatesByDuty = new Map<DutyKey, DutyCandidate[]>();
  for (const key of DUTY_KEYS) {
    candidatesByDuty.set(
      key,
      people
        .filter((p) => p.sex === "male" && p.flags[key])
        .map((p) => ({ id: p.id, name: p.name })),
    );
  }

  return {
    ok: true,
    programMissingDates: [...new Set(programMissingDates)].sort(),
    draft: draft.map((day) => {
      const excluded = excludedByDate.get(day.date) ?? new Set<string>();
      const micExcluded = micExcludedByDate.get(day.date) ?? new Set<string>();
      return {
        date: day.date,
        kind: day.kind,
        programConflictNames: conflictNamesByDate.get(day.date) ?? [],
        slots: day.slots.map((slot) => {
          const blocked =
            slot.dutyKey === "microphone" ? new Set([...excluded, ...micExcluded]) : excluded;
          return {
            dutyKey: slot.dutyKey,
            dutyName: slot.dutyName,
            postLabel: slot.postLabel,
            side: slot.side,
            personId: slot.personId,
            candidates: candidatesByDuty.get(slot.dutyKey) ?? [],
            conflictIds: (candidatesByDuty.get(slot.dutyKey) ?? [])
              .filter((c) => blocked.has(c.id))
              .map((c) => c.id),
          };
        }),
      };
    }),
  };
}

export interface DutySaveSlot {
  dutyKey: string;
  postLabel: string;
  side: string | null;
  personId: string | null;
  isManual: boolean;
}

export interface DutySaveDate {
  date: string;
  kind: "midweek" | "weekend";
  slots: DutySaveSlot[];
}

export async function saveDutyProgram(
  dates: DutySaveDate[],
): Promise<{ ok: boolean; error?: string; programId?: string; assignmentCount?: number }> {
  const user = await requirePrivilegedUser();
  if (dates.length === 0) return { ok: false, error: "Selecciona al menos un día." };
  const db = getDb();

  let personRows: { id: string; firstName: string; lastName: string }[];
  try {
    personRows = await db
      .select({ id: persons.id, firstName: persons.firstName, lastName: persons.lastName })
      .from(persons);
  } catch {
    return { ok: false, error: "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo." };
  }
  const names = new Map(personRows.map((p) => [p.id, `${p.firstName} ${p.lastName}`.trim()]));
  for (const day of dates) {
    for (const slot of day.slots) {
      if (slot.personId !== null && !names.has(slot.personId)) {
        return { ok: false, error: "Hay una persona inválida en la escala." };
      }
    }
  }

  const taken = await listActiveDutyDates();
  const overlap = dates.map((d) => d.date).filter((d) => taken.has(d));
  if (overlap.length > 0) {
    return {
      ok: false,
      error: `Esa fecha ya tiene escala creada (${overlap.sort()[0]}). Abre la escala existente en vez de crear otra.`,
    };
  }

  const sorted = [...dates].sort((a, b) => (a.date < b.date ? -1 : 1));
  const programId = randomUUID();
  try {
    await db.insert(dutyPrograms).values({
      id: programId,
      startDate: sorted[0]?.date ?? "",
      endDate: sorted[sorted.length - 1]?.date ?? "",
      status: "draft",
      createdBy: user.id,
    });

    let sortOrder = 0;
    let assignmentCount = 0;
    for (const day of sorted) {
      for (const slot of day.slots) {
        sortOrder += 1;
        await db.insert(dutyAssignments).values({
          id: randomUUID(),
          programId,
          assignmentDate: day.date,
          meetingKind: day.kind,
          dutyKey: slot.dutyKey,
          postLabel: slot.postLabel,
          side: slot.side,
          personId: slot.personId,
          personName: slot.personId ? (names.get(slot.personId) ?? "") : "",
          isManual: slot.isManual,
          sortOrder,
        });
        assignmentCount += 1;
      }
    }

    revalidatePath("/designacoes");
    return { ok: true, programId, assignmentCount };
  } catch (error) {
    console.error("[duties] falha ao salvar escala", { programId, error });
    if (isMissingTableError(error)) return { ok: false, error: DUTY_TABLES_MISSING_ERROR };
    return { ok: false, error: "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo." };
  }
}

export async function updateDutyAssignment(
  assignmentId: string,
  personId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  await requirePrivilegedUser();
  try {
    const db = getDb();
    let personName = "";
    if (personId !== null) {
      const rows = await db
        .select({ id: persons.id, firstName: persons.firstName, lastName: persons.lastName })
        .from(persons)
        .where(eq(persons.id, personId))
        .limit(1);
      const person = rows[0];
      if (!person) return { ok: false, error: "Persona no encontrada." };
      personName = `${person.firstName} ${person.lastName}`.trim();
    }
    await db
      .update(dutyAssignments)
      .set({ personId, personName, isManual: true })
      .where(eq(dutyAssignments.id, assignmentId));
    revalidatePath("/designacoes");
    return { ok: true };
  } catch (error) {
    console.error("[duties] falha ao designar", { assignmentId, error });
    if (isMissingTableError(error)) return { ok: false, error: DUTY_TABLES_MISSING_ERROR };
    return { ok: false, error: "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo." };
  }
}

export async function deleteDutyProgram(
  programId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requirePrivilegedUser();
  try {
    const db = getDb();
    await db.delete(dutyPrograms).where(eq(dutyPrograms.id, programId));
    revalidatePath("/designacoes");
    return { ok: true };
  } catch (error) {
    console.error("[duties] falha ao excluir escala", { programId, error });
    if (isMissingTableError(error)) return { ok: false, error: DUTY_TABLES_MISSING_ERROR };
    return { ok: false, error: "No se pudo eliminar. Inténtalo de nuevo." };
  }
}

export async function updateDutyProgramStatus(
  programId: string,
  status: "draft" | "confirmed" | "archived",
): Promise<{ ok: boolean; error?: string }> {
  await requirePrivilegedUser();
  try {
    const db = getDb();
    await db.update(dutyPrograms).set({ status }).where(eq(dutyPrograms.id, programId));
    revalidatePath("/designacoes");
    return { ok: true };
  } catch (error) {
    console.error("[duties] falha ao atualizar status da escala", { programId, status, error });
    if (isMissingTableError(error)) return { ok: false, error: DUTY_TABLES_MISSING_ERROR };
    return { ok: false, error: "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo." };
  }
}

import { and, asc, eq, gte, lte, ne, or } from "drizzle-orm";
import {
  cleaningAssignments,
  cleaningPrograms,
} from "@/features/cleaning/infrastructure/cleaning-program-schema";
import { cleaningSectors } from "@/features/cleaning/infrastructure/cleaning-schema";
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

export interface PublicShareCleaning {
  date: string;
  sectorName: string;
  sectorNameEs: string;
  task: string;
  taskEs: string;
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
  cleaning: PublicShareCleaning[];
}

/**
 * Enlace público estendido: semana anterior à da solicitação + todas as
 * futuras já cadastradas (teto de semanas à frente, além da anterior que
 * vai sempre — mesmo vazia). O consumidor espelha exatamente este envio.
 */
export interface PublicRangePayload {
  generatedAt: string;
  congregationName: string;
  weeks: PublicWeekPayload[];
}

/** Teto de semanas futuras no enlace (a anterior vai sempre, fora do teto). */
export const PUBLIC_RANGE_FUTURE_WEEKS = 26;

function addDaysISO(dateISO: string, days: number): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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
  const generatedAt = new Date().toISOString();
  const congregationName = await readCongregationName();
  const week = await loadWeek(weekStart, weekEnd);
  return { weekStart, weekEnd, generatedAt, congregationName, ...week };
}

/**
 * Intervalo do enlace público: semana anterior à da solicitação (sempre,
 * mesmo sem programa salvo) + semana atual (sempre, vazia quando ainda sem
 * programa) + futuras com programa cadastrado, limitadas a
 * PUBLIC_RANGE_FUTURE_WEEKS à frente. Traz tudo o que está salvo
 * (rascunho e confirmado); só limpeza arquivada fica de fora, como na semana.
 */
export async function buildPublicRangePayload(
  reference: Date = new Date(),
): Promise<PublicRangePayload> {
  const { weekStart } = getWeekRange(reference);
  const generatedAt = new Date().toISOString();
  const congregationName = await readCongregationName();
  const futureWeekStarts = await readFutureWeekStarts(weekStart);
  const previousWeekStart = addDaysISO(weekStart, -7);
  const weekStarts = [
    previousWeekStart,
    ...futureWeekStarts.filter((start) => start !== previousWeekStart),
  ];
  // A semana atual vai sempre (vazia quando ainda sem programa): o
  // consumidor ancora a página nela e espelha exatamente este envio.
  if (!weekStarts.includes(weekStart)) weekStarts.splice(1, 0, weekStart);
  const weeks: PublicWeekPayload[] = [];
  for (const start of weekStarts) {
    const end = addDaysISO(start, 6);
    const week = await loadWeek(start, end);
    weeks.push({ weekStart: start, weekEnd: end, generatedAt, congregationName, ...week });
  }
  return { generatedAt, congregationName, weeks };
}

/** Semanas com programa salvo a partir de `fromWeekStart` (crescente, com teto). */
async function readFutureWeekStarts(fromWeekStart: string): Promise<string[]> {
  try {
    const rows = await getDb()
      .selectDistinct({ weekStart: meetingPrograms.weekStart })
      .from(meetingPrograms)
      .where(gte(meetingPrograms.weekStart, fromWeekStart))
      .orderBy(asc(meetingPrograms.weekStart))
      .limit(PUBLIC_RANGE_FUTURE_WEEKS);
    const starts = new Set<string>();
    for (const row of rows) {
      if (typeof row.weekStart === "string" && row.weekStart !== "") starts.add(row.weekStart);
    }
    // O teto já vai no SQL; o fatiamento aqui é rede de segurança.
    return [...starts].slice(0, PUBLIC_RANGE_FUTURE_WEEKS);
  } catch {
    return [];
  }
}

async function readCongregationName(): Promise<string> {
  const db = getDb();
  try {
    const settings = await db
      .select({ congregationName: meetingSettings.congregationName })
      .from(meetingSettings)
      .limit(1);
    return settings[0]?.congregationName ?? "";
  } catch {
    return "";
  }
}

interface LoadedWeek {
  midweek: PublicShareMeeting | null;
  weekend: PublicShareMeeting | null;
  duties: PublicShareDuty[];
  cleaning: PublicShareCleaning[];
}

async function loadWeek(weekStart: string, weekEnd: string): Promise<LoadedWeek> {
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
    const rows = await getDb()
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

  // Limpeza: tudo exceto programas arquivados (rascunho entra, igual à
  // tela de Designações), só na semana. A tarefa vem do setor (mesmo tipo
  // do programa). Setor padrão casa por `key`, setor customizado (key nula)
  // casa por `id` — igual à troca manual. Setor ausente vira "".
  let cleaning: PublicShareCleaning[] = [];
  try {
    const rows = await getDb()
      .select({
        date: cleaningAssignments.assignmentDate,
        sectorName: cleaningAssignments.sectorName,
        sectorNameEs: cleaningSectors.nameEs,
        task: cleaningSectors.task,
        taskEs: cleaningSectors.taskEs,
        personName: cleaningAssignments.personName,
        status: cleaningPrograms.status,
      })
      .from(cleaningAssignments)
      .innerJoin(cleaningPrograms, eq(cleaningPrograms.id, cleaningAssignments.programId))
      .leftJoin(
        cleaningSectors,
        and(
          eq(cleaningSectors.cleaningTypeKey, cleaningPrograms.typeKey),
          or(
            eq(cleaningSectors.key, cleaningAssignments.sectorKey),
            eq(cleaningSectors.id, cleaningAssignments.sectorKey),
          ),
        ),
      )
      .where(
        and(
          ne(cleaningPrograms.status, "archived"),
          gte(cleaningAssignments.assignmentDate, weekStart),
          lte(cleaningAssignments.assignmentDate, weekEnd),
        ),
      )
      .orderBy(asc(cleaningAssignments.assignmentDate), asc(cleaningAssignments.sortOrder));
    cleaning = rows
      .filter((row) => row.status !== "archived")
      .map((row) => ({
        date: row.date,
        sectorName: row.sectorName,
        sectorNameEs: row.sectorNameEs ?? "",
        task: row.task ?? "",
        taskEs: row.taskEs ?? "",
        personName: row.personName,
      }));
  } catch {
    cleaning = [];
  }

  return { midweek, weekend, duties, cleaning };
}

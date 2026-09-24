"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePrivilegedUser } from "@/features/auth/application/session";
import {
  blocksMeeting,
  resolveWeekOverrides,
} from "@/features/meetings/domain/special-event-weeks";
import {
  type MeetingKind,
  meetingAssignments,
  meetingPrograms,
} from "@/features/meetings/infrastructure/meeting-schema";
import { persons } from "@/features/people/infrastructure/person-schema";
import { getMeetingSchedule, listSpecialEvents } from "@/features/settings/application/queries";
import { es } from "@/shared/i18n/es";
import { getDb } from "@/shared/lib/db";

const kindSchema = z.enum(["midweek", "weekend"]);
const weekSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const partSchema = z.object({
  partKey: z.string().min(1).max(80),
  section: z.string().max(80).default(""),
  title: z.string().min(1).max(300),
  subtitle: z.string().max(300).default(""),
  startTime: z.string().max(10).default(""),
  durationMinutes: z.number().int().min(0).max(180),
  songNumber: z.number().int().min(1).max(1000).nullable().optional(),
  songTheme: z.string().max(300).default(""),
  classroom: z.enum(["A", "B", "C"]).default("A"),
  study: z.string().max(300).default(""),
  source: z.string().max(300).default(""),
  notes: z.string().max(500).default(""),
  speakerCongregation: z.string().max(160).default(""),
});

const exceptionSchema = z.object({
  exceptionType: z
    .enum(["", "no_meeting", "circuit_visit", "convention", "virtual_convention", "special"])
    .default(""),
  exceptionLabel: z.string().max(300).default(""),
});

const MEETING_TABLES_MISSING_ERROR =
  "Tablas de reuniones no creadas en la base de datos. Ejecuta `npm run db:push` y recarga la página.";

function isMissingTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("meeting_programs") ||
    message.includes("meeting_assignments") ||
    message.includes("does not exist")
  );
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function dateForWeekday(mondayISO: string, weekday: number): string {
  return addDaysISO(mondayISO, (weekday - 1 + 7) % 7);
}

export async function saveMeetingProgram(
  kind: MeetingKind,
  weekStart: string,
  date: string,
  parts: z.infer<typeof partSchema>[],
  outlineId?: string | null,
  exception?: z.infer<typeof exceptionSchema> | null,
): Promise<{ ok: boolean; programId?: string; error?: string }> {
  const parsedKind = kindSchema.safeParse(kind);
  const parsedWeek = weekSchema.safeParse(weekStart);
  const parsedDate = weekSchema.safeParse(date);
  if (!parsedKind.success || !parsedWeek.success || !parsedDate.success) {
    return { ok: false, error: "Datos de la semana no válidos." };
  }
  const parsedParts = z.array(partSchema).max(60).safeParse(parts);
  if (!parsedParts.success) return { ok: false, error: "Partes no válidas." };
  const parsedException = exceptionSchema.safeParse(exception ?? {});
  if (!parsedException.success) return { ok: false, error: "Excepción no válida." };

  const user = await requirePrivilegedUser();

  // Evento especial prevalece: semana de asamblea/celebración não programa reunião.
  const [meetingSchedule, weekEvents] = await Promise.all([
    getMeetingSchedule(),
    listSpecialEvents(),
  ]);
  const overrides = resolveWeekOverrides(
    {
      weekStart,
      weekEnd: addDaysISO(weekStart, 6),
      midweekDate: dateForWeekday(weekStart, meetingSchedule.midweekDay),
      weekendDate: dateForWeekday(weekStart, meetingSchedule.weekendDay),
    },
    weekEvents,
  );
  if (blocksMeeting(kind === "midweek" ? overrides.midweek : overrides.weekend)) {
    return { ok: false, error: es.eventBlockedSave };
  }

  const db = getDb();

  let existing: (typeof meetingPrograms.$inferSelect)[] | undefined;
  try {
    existing = await db
      .select()
      .from(meetingPrograms)
      .where(and(eq(meetingPrograms.kind, kind), eq(meetingPrograms.weekStart, weekStart)))
      .limit(1);
  } catch (error) {
    console.error("[meetings] falha ao buscar programa", { kind, weekStart, error });
    if (isMissingTableError(error)) return { ok: false, error: MEETING_TABLES_MISSING_ERROR };
    return { ok: false, error: "No se pudo guardar el programa." };
  }

  const programId = existing[0]?.id ?? randomUUID();
  try {
    if (existing[0]) {
      await db
        .update(meetingPrograms)
        .set({
          date,
          outlineId: outlineId ?? null,
          exceptionType: parsedException.data.exceptionType,
          exceptionLabel: parsedException.data.exceptionLabel,
          updatedAt: new Date(),
        })
        .where(eq(meetingPrograms.id, programId));
    } else {
      await db.insert(meetingPrograms).values({
        id: programId,
        kind,
        weekStart,
        date,
        outlineId: outlineId ?? null,
        exceptionType: parsedException.data.exceptionType,
        exceptionLabel: parsedException.data.exceptionLabel,
        status: "draft",
        createdBy: user.id,
      });
    }
    // Upsert não-destrutivo por part_key: preserva designações (pessoa,
    // ajudante, cântico) quando a parte continua existindo; remove apenas as
    // partes que saíram do modelo e insere as novas.
    const current = await db
      .select()
      .from(meetingAssignments)
      .where(eq(meetingAssignments.programId, programId));
    const currentByKey = new Map(current.map((row) => [row.partKey, row]));
    const incomingKeys = new Set(parsedParts.data.map((p) => p.partKey));

    for (const stale of current) {
      if (!incomingKeys.has(stale.partKey)) {
        await db.delete(meetingAssignments).where(eq(meetingAssignments.id, stale.id));
      }
    }
    let sortOrder = 0;
    for (const p of parsedParts.data) {
      const kept = currentByKey.get(p.partKey);
      const values = {
        section: p.section,
        title: p.title,
        subtitle: p.subtitle,
        startTime: p.startTime,
        durationMinutes: p.durationMinutes,
        classroom: p.classroom,
        study: p.study,
        source: p.source,
        notes: p.notes,
        speakerCongregation: p.speakerCongregation,
        sortOrder,
      };
      sortOrder += 1;
      if (kept) {
        await db
          .update(meetingAssignments)
          .set({
            ...values,
            // Preserva cântico salvo se a reimportação vier sem número.
            songNumber: p.songNumber ?? kept.songNumber,
            songTheme: p.songTheme || kept.songTheme,
          })
          .where(eq(meetingAssignments.id, kept.id));
      } else {
        await db.insert(meetingAssignments).values({
          id: randomUUID(),
          programId,
          partKey: p.partKey,
          ...values,
          songNumber: p.songNumber ?? null,
          songTheme: p.songTheme,
        });
      }
    }
  } catch (error) {
    console.error("[meetings] falha ao salvar programa", { programId, error });
    if (isMissingTableError(error)) return { ok: false, error: MEETING_TABLES_MISSING_ERROR };
    return { ok: false, error: "No se pudo guardar el programa." };
  }
  revalidatePath("/reunioes");
  return { ok: true, programId };
}

const assignSchema = z.object({
  assignmentId: z.string().min(1).max(64),
  personId: z.string().min(1).max(64).nullable(),
  helperPersonId: z.string().min(1).max(64).nullable().optional(),
});

const assignmentDetailsSchema = z.object({
  assignmentId: z.string().min(1).max(64),
  classroom: z.enum(["A", "B", "C"]).optional(),
  speakerCongregation: z.string().max(160).optional(),
  speakerName: z.string().trim().min(1).max(160).optional(),
  title: z.string().trim().min(1).max(300).optional(),
  study: z.string().max(300).optional(),
  source: z.string().max(300).optional(),
  notes: z.string().max(500).optional(),
});

export async function updateMeetingAssignment(
  assignmentId: string,
  personId: string | null,
  helperPersonId?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  await requirePrivilegedUser();
  const parsed = assignSchema.safeParse({ assignmentId, personId, helperPersonId });
  if (!parsed.success) return { ok: false, error: "Datos no válidos." };
  const db = getDb();
  try {
    const [existing] = await db
      .select()
      .from(meetingAssignments)
      .where(eq(meetingAssignments.id, assignmentId))
      .limit(1);
    if (!existing) return { ok: false, error: "Parte no encontrada." };

    let personName = "";
    if (personId) {
      const [person] = await db.select().from(persons).where(eq(persons.id, personId)).limit(1);
      if (!person) return { ok: false, error: "Persona no encontrada." };
      personName = `${person.firstName} ${person.lastName}`;
    }
    let helperName = existing.helperPersonName;
    let helperId = existing.helperPersonId;
    if (helperPersonId !== undefined) {
      helperId = helperPersonId;
      helperName = "";
      if (helperPersonId) {
        const [helper] = await db
          .select()
          .from(persons)
          .where(eq(persons.id, helperPersonId))
          .limit(1);
        if (!helper) return { ok: false, error: "Ayudante no encontrado." };
        helperName = `${helper.firstName} ${helper.lastName}`;
      }
    }
    await db
      .update(meetingAssignments)
      .set({ personId, personName, helperPersonId: helperId, helperPersonName: helperName })
      .where(eq(meetingAssignments.id, assignmentId));
    // Histórico para rodízio (Fase 3): registra a data da última designação.
    const now = new Date();
    const touchedIds = [personId, helperPersonId ?? helperId].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    for (const id of new Set(touchedIds)) {
      await db.update(persons).set({ lastAssignmentAt: now }).where(eq(persons.id, id));
    }
  } catch (error) {
    console.error("[meetings] falha ao designar", { assignmentId, error });
    if (isMissingTableError(error)) return { ok: false, error: MEETING_TABLES_MISSING_ERROR };
    return { ok: false, error: "No se pudo guardar la designación." };
  }
  revalidatePath("/reunioes");
  return { ok: true };
}

export async function updateMeetingAssignmentDetails(
  input: z.infer<typeof assignmentDetailsSchema>,
): Promise<{ ok: boolean; error?: string }> {
  await requirePrivilegedUser();
  const parsed = assignmentDetailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos no válidos." };
  const { assignmentId, speakerName, ...fields } = parsed.data;
  // Orador de fora: nome livre no lugar do vínculo de pessoa (limpa o anterior).
  const setFields =
    speakerName === undefined
      ? fields
      : {
          ...fields,
          personId: null,
          personName: speakerName,
          helperPersonId: null,
          helperPersonName: "",
        };
  if (Object.keys(setFields).length === 0) return { ok: true };
  try {
    await getDb()
      .update(meetingAssignments)
      .set(setFields)
      .where(eq(meetingAssignments.id, assignmentId));
  } catch (error) {
    console.error("[meetings] falha ao salvar detalhes da parte", { assignmentId, error });
    if (isMissingTableError(error)) return { ok: false, error: MEETING_TABLES_MISSING_ERROR };
    return { ok: false, error: "No se pudo guardar los detalles." };
  }
  revalidatePath("/reunioes");
  return { ok: true };
}

export async function updateMeetingException(
  programId: string,
  exception: z.infer<typeof exceptionSchema>,
): Promise<{ ok: boolean; error?: string }> {
  await requirePrivilegedUser();
  const parsedId = z.string().min(1).max(64).safeParse(programId);
  const parsed = exceptionSchema.safeParse(exception);
  if (!parsedId.success || !parsed.success) return { ok: false, error: "Datos no válidos." };
  try {
    await getDb()
      .update(meetingPrograms)
      .set({
        exceptionType: parsed.data.exceptionType,
        exceptionLabel: parsed.data.exceptionLabel,
        updatedAt: new Date(),
      })
      .where(eq(meetingPrograms.id, parsedId.data));
  } catch (error) {
    console.error("[meetings] falha ao salvar exceção", { programId, error });
    if (isMissingTableError(error)) return { ok: false, error: MEETING_TABLES_MISSING_ERROR };
    return { ok: false, error: "No se pudo guardar la excepción." };
  }
  revalidatePath("/reunioes");
  return { ok: true };
}

export async function updateMeetingSong(
  assignmentId: string,
  songNumber: number,
  songTheme: string,
): Promise<{ ok: boolean; error?: string }> {
  await requirePrivilegedUser();
  const parsed = z
    .object({ assignmentId: z.string().min(1), songNumber: z.number().int().min(1).max(1000) })
    .safeParse({ assignmentId, songNumber });
  if (!parsed.success) return { ok: false, error: "Cántico no válido." };
  const db = getDb();
  try {
    await db
      .update(meetingAssignments)
      .set({ songNumber, songTheme: songTheme.slice(0, 300) })
      .where(eq(meetingAssignments.id, assignmentId));
  } catch (error) {
    console.error("[meetings] falha ao salvar cântico", { assignmentId, error });
    if (isMissingTableError(error)) return { ok: false, error: MEETING_TABLES_MISSING_ERROR };
    return { ok: false, error: "No se pudo guardar el cántico." };
  }
  revalidatePath("/reunioes");
  return { ok: true };
}

const stagedItemSchema = z.object({
  assignmentId: z.string().min(1).max(64),
  label: z.string().min(1).max(300),
  personId: z.string().min(1).max(64).nullable().optional(),
  helperPersonId: z.string().min(1).max(64).nullable().optional(),
  songNumber: z.number().int().min(1).max(1000).nullable().optional(),
  songTheme: z.string().max(300).optional(),
  title: z.string().min(1).max(300).optional(),
  classroom: z.enum(["A", "B", "C"]).optional(),
  speakerCongregation: z.string().max(160).optional(),
  speakerName: z.string().min(1).max(160).optional(),
});

export type StagedChangeInput = z.infer<typeof stagedItemSchema>;

type AssignmentPatch = Partial<{
  personId: string | null;
  personName: string;
  helperPersonId: string | null;
  helperPersonName: string;
  songNumber: number;
  songTheme: string;
  title: string;
  classroom: "A" | "B" | "C";
  speakerCongregation: string;
}>;

/**
 * Salva todas as designações encenadas em UMA invocação: 1 auth, selects em
 * lote (pessoas + partes), updates em batch, 1 toque de rodízio e 1
 * revalidate — em vez de N actions sequenciais com auth e revalidate próprios.
 */
export async function saveStagedChanges(
  items: StagedChangeInput[],
): Promise<{ ok: boolean; failedLabel?: string; error?: string }> {
  const parsed = z.array(stagedItemSchema).min(1).max(60).safeParse(items);
  if (!parsed.success) return { ok: false, error: "Datos no válidos." };
  const changes = parsed.data;

  await requirePrivilegedUser();
  const db = getDb();

  const fail = (label: string, error: string) => ({
    ok: false as const,
    failedLabel: label,
    error,
  });

  try {
    // Nomes de uma vez (sem 1 select por pessoa).
    const wantedIds = [
      ...new Set(
        changes
          .flatMap((item) => [item.personId, item.helperPersonId])
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    ];
    let names = new Map<string, string>();
    if (wantedIds.length > 0) {
      const personRows = await db
        .select({ id: persons.id, firstName: persons.firstName, lastName: persons.lastName })
        .from(persons)
        .where(inArray(persons.id, wantedIds));
      names = new Map(
        personRows.map((person) => [person.id, `${person.firstName} ${person.lastName}`]),
      );
    }

    // Partes envolvidas de uma vez (sem 1 select por parte).
    const assignmentRows = await db
      .select()
      .from(meetingAssignments)
      .where(
        inArray(
          meetingAssignments.id,
          changes.map((item) => item.assignmentId),
        ),
      );
    const assignmentById = new Map(assignmentRows.map((row) => [row.id, row]));

    const statements = [];
    const touchedIds: string[] = [];
    for (const item of changes) {
      const existing = assignmentById.get(item.assignmentId);
      if (!existing) return fail(item.label, "Parte no encontrada.");
      if (item.personId) {
        if (!names.has(item.personId)) return fail(item.label, "Persona no encontrada.");
      }
      if (item.helperPersonId) {
        if (!names.has(item.helperPersonId)) return fail(item.label, "Ayudante no encontrado.");
      }
      const patch: AssignmentPatch = {};
      if (item.speakerName !== undefined) {
        // Orador de fora: nome livre no lugar do vínculo de pessoa.
        Object.assign(patch, {
          personId: null,
          personName: item.speakerName,
          helperPersonId: null,
          helperPersonName: "",
        });
        if (item.classroom !== undefined) patch.classroom = item.classroom;
        if (item.speakerCongregation !== undefined)
          patch.speakerCongregation = item.speakerCongregation;
      } else {
        if (item.personId !== undefined) {
          patch.personId = item.personId;
          patch.personName = item.personId ? (names.get(item.personId) ?? "") : "";
          patch.helperPersonId = item.helperPersonId ?? existing.helperPersonId;
          patch.helperPersonName =
            item.helperPersonId !== undefined
              ? item.helperPersonId
                ? (names.get(item.helperPersonId) ?? "").trim()
                : ""
              : existing.helperPersonName;
        }
        if (item.songNumber !== undefined && item.songNumber !== null) {
          patch.songNumber = item.songNumber;
          patch.songTheme = (item.songTheme ?? "").slice(0, 300);
        }
        if (item.title !== undefined) patch.title = item.title;
        if (item.classroom !== undefined) patch.classroom = item.classroom;
        if (item.speakerCongregation !== undefined)
          patch.speakerCongregation = item.speakerCongregation;
      }
      if (Object.keys(patch).length === 0) continue;
      statements.push(
        db
          .update(meetingAssignments)
          .set(patch)
          .where(eq(meetingAssignments.id, item.assignmentId)),
      );
      if (item.personId) touchedIds.push(item.personId);
      if (item.helperPersonId) touchedIds.push(item.helperPersonId);
    }

    // Updates independentes disparam em paralelo (1 invocação, sem N roundtrips sequenciais).
    if (statements.length > 0) await Promise.all(statements);
    // Histórico para rodízio: um update só, em vez de um por pessoa.
    const touched = [...new Set(touchedIds)];
    if (touched.length > 0) {
      await db
        .update(persons)
        .set({ lastAssignmentAt: new Date() })
        .where(inArray(persons.id, touched));
    }
  } catch (error) {
    console.error("[meetings] falha ao salvar lote de designações", {
      count: changes.length,
      error,
    });
    if (isMissingTableError(error)) return { ok: false, error: MEETING_TABLES_MISSING_ERROR };
    return { ok: false, error: "No se pudieron guardar las designaciones." };
  }
  revalidatePath("/reunioes");
  return { ok: true };
}

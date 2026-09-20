"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePrivilegedUser } from "@/features/auth/application/session";
import {
  type MeetingKind,
  meetingAssignments,
  meetingPrograms,
} from "@/features/meetings/infrastructure/meeting-schema";
import { persons } from "@/features/people/infrastructure/person-schema";
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
});

const MEETING_TABLES_MISSING_ERROR =
  "Tabelas de reuniões não criadas no banco. Execute `npm run db:push` e recarregue a página.";

function isMissingTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("meeting_programs") ||
    message.includes("meeting_assignments") ||
    message.includes("does not exist")
  );
}

export async function saveMeetingProgram(
  kind: MeetingKind,
  weekStart: string,
  date: string,
  parts: z.infer<typeof partSchema>[],
  outlineId?: string | null,
): Promise<{ ok: boolean; programId?: string; error?: string }> {
  const parsedKind = kindSchema.safeParse(kind);
  const parsedWeek = weekSchema.safeParse(weekStart);
  const parsedDate = weekSchema.safeParse(date);
  if (!parsedKind.success || !parsedWeek.success || !parsedDate.success) {
    return { ok: false, error: "Dados da semana inválidos." };
  }
  const parsedParts = z.array(partSchema).max(60).safeParse(parts);
  if (!parsedParts.success) return { ok: false, error: "Partes inválidas." };

  const user = await requirePrivilegedUser();
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
    return { ok: false, error: "Não foi possível salvar o programa." };
  }

  const programId = existing[0]?.id ?? randomUUID();
  try {
    if (existing[0]) {
      await db
        .update(meetingPrograms)
        .set({ date, outlineId: outlineId ?? null, updatedAt: new Date() })
        .where(eq(meetingPrograms.id, programId));
      await db.delete(meetingAssignments).where(eq(meetingAssignments.programId, programId));
    } else {
      await db.insert(meetingPrograms).values({
        id: programId,
        kind,
        weekStart,
        date,
        outlineId: outlineId ?? null,
        status: "draft",
        createdBy: user.id,
      });
    }
    if (parsedParts.data.length > 0) {
      await db.insert(meetingAssignments).values(
        parsedParts.data.map((p, index) => ({
          id: randomUUID(),
          programId,
          partKey: p.partKey,
          section: p.section,
          title: p.title,
          subtitle: p.subtitle,
          startTime: p.startTime,
          durationMinutes: p.durationMinutes,
          songNumber: p.songNumber ?? null,
          songTheme: p.songTheme,
          sortOrder: index,
        })),
      );
    }
  } catch (error) {
    console.error("[meetings] falha ao salvar programa", { programId, error });
    if (isMissingTableError(error)) return { ok: false, error: MEETING_TABLES_MISSING_ERROR };
    return { ok: false, error: "Não foi possível salvar o programa." };
  }
  revalidatePath("/reunioes");
  return { ok: true, programId };
}

const assignSchema = z.object({
  assignmentId: z.string().min(1).max(64),
  personId: z.string().min(1).max(64).nullable(),
  helperPersonId: z.string().min(1).max(64).nullable().optional(),
});

export async function updateMeetingAssignment(
  assignmentId: string,
  personId: string | null,
  helperPersonId?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  await requirePrivilegedUser();
  const parsed = assignSchema.safeParse({ assignmentId, personId, helperPersonId });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const db = getDb();
  try {
    const [existing] = await db
      .select()
      .from(meetingAssignments)
      .where(eq(meetingAssignments.id, assignmentId))
      .limit(1);
    if (!existing) return { ok: false, error: "Parte não encontrada." };

    let personName = "";
    if (personId) {
      const [person] = await db.select().from(persons).where(eq(persons.id, personId)).limit(1);
      if (!person) return { ok: false, error: "Pessoa não encontrada." };
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
        if (!helper) return { ok: false, error: "Ajudante não encontrado." };
        helperName = `${helper.firstName} ${helper.lastName}`;
      }
    }
    await db
      .update(meetingAssignments)
      .set({ personId, personName, helperPersonId: helperId, helperPersonName: helperName })
      .where(eq(meetingAssignments.id, assignmentId));
  } catch (error) {
    console.error("[meetings] falha ao designar", { assignmentId, error });
    if (isMissingTableError(error)) return { ok: false, error: MEETING_TABLES_MISSING_ERROR };
    return { ok: false, error: "Não foi possível salvar a designação." };
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
  if (!parsed.success) return { ok: false, error: "Cântico inválido." };
  const db = getDb();
  try {
    await db
      .update(meetingAssignments)
      .set({ songNumber, songTheme: songTheme.slice(0, 300) })
      .where(eq(meetingAssignments.id, assignmentId));
  } catch (error) {
    console.error("[meetings] falha ao salvar cântico", { assignmentId, error });
    if (isMissingTableError(error)) return { ok: false, error: MEETING_TABLES_MISSING_ERROR };
    return { ok: false, error: "Não foi possível salvar o cântico." };
  }
  revalidatePath("/reunioes");
  return { ok: true };
}

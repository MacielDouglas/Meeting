"use server";

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOwnerUser } from "@/features/auth/application/session";
import {
  createScheduleExceptionSchema,
  createSpecialEventSchema,
  deleteRecordSchema,
  meetingScheduleSchema,
} from "@/features/settings/application/settings-validation";
import {
  meetingSettings,
  SETTINGS_ID,
  scheduleExceptions,
  specialEvents,
} from "@/features/settings/infrastructure/settings-schema";
import { getDb } from "@/shared/lib/db";

export interface SettingsActionResult {
  ok: boolean;
  error?: string;
}

function revalidateSettingsPages() {
  revalidatePath("/configuracion");
  revalidatePath("/");
}

export async function saveMeetingSchedule(input: unknown): Promise<SettingsActionResult> {
  const parsed = meetingScheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa el día y la hora informados." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo el owner puede cambiar los horarios." };
  }
  const scheduleValues = {
    congregationName: parsed.data.congregationName ?? "",
    midweekDay: parsed.data.midweekDay,
    midweekTime: parsed.data.midweekTime,
    weekendDay: parsed.data.weekendDay,
    weekendTime: parsed.data.weekendTime,
  };
  const values = { id: SETTINGS_ID, ...scheduleValues };
  const onConflictSet = { ...scheduleValues, updatedAt: new Date() };
  try {
    await getDb()
      .insert(meetingSettings)
      .values(values)
      .onConflictDoUpdate({ target: meetingSettings.id, set: onConflictSet });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Banco ainda sem a migração: cria a coluna e tenta de novo sozinho.
    if (!message.includes("congregation_name")) throw error;
    await getDb().execute(
      sql`ALTER TABLE meeting_settings ADD COLUMN IF NOT EXISTS congregation_name text NOT NULL DEFAULT ''`,
    );
    await getDb()
      .insert(meetingSettings)
      .values(values)
      .onConflictDoUpdate({ target: meetingSettings.id, set: onConflictSet });
  }
  revalidateSettingsPages();
  return { ok: true };
}

export async function createSpecialEvent(input: unknown): Promise<SettingsActionResult> {
  const parsed = createSpecialEventSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { ok: false, error: firstIssue?.message ?? "Revisa los datos del evento." };
  }
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo el owner puede crear eventos." };
  }
  await getDb()
    .insert(specialEvents)
    .values({
      id: randomUUID(),
      type: parsed.data.type,
      title: parsed.data.title,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate ?? null,
      startTime: parsed.data.startTime,
      notes: parsed.data.notes ?? null,
    });
  revalidateSettingsPages();
  return { ok: true };
}

export async function deleteSpecialEvent(input: unknown): Promise<SettingsActionResult> {
  const parsed = deleteRecordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Evento no válido." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo el owner puede excluir eventos." };
  }
  await getDb().delete(specialEvents).where(eq(specialEvents.id, parsed.data.id));
  revalidateSettingsPages();
  return { ok: true };
}

export async function createScheduleException(input: unknown): Promise<SettingsActionResult> {
  const parsed = createScheduleExceptionSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { ok: false, error: firstIssue?.message ?? "Revisa los datos de la excepción." };
  }
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo el owner puede crear excepciones." };
  }
  await getDb()
    .insert(scheduleExceptions)
    .values({
      id: randomUUID(),
      type: parsed.data.type,
      date: parsed.data.date,
      notes: parsed.data.notes ?? null,
    });
  revalidateSettingsPages();
  return { ok: true };
}

export async function deleteScheduleException(input: unknown): Promise<SettingsActionResult> {
  const parsed = deleteRecordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Excepción no válida." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo el owner puede excluir excepciones." };
  }
  await getDb().delete(scheduleExceptions).where(eq(scheduleExceptions.id, parsed.data.id));
  revalidateSettingsPages();
  return { ok: true };
}

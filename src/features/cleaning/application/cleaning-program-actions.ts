"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwnerUser } from "@/features/auth/application/session";
import {
  type AssignmentInput,
  generateCleaningAssignments,
  validateWeeklyConstraint,
} from "@/features/cleaning/domain/assign-cleaning";
import {
  cleaningAssignments,
  cleaningPrograms,
} from "@/features/cleaning/infrastructure/cleaning-program-schema";
import { cleaningSectors, cleaningTypes } from "@/features/cleaning/infrastructure/cleaning-schema";
import { persons } from "@/features/people/infrastructure/person-schema";
import {
  meetingSettings,
  scheduleExceptions,
  specialEvents,
} from "@/features/settings/infrastructure/settings-schema";
import { getDb } from "@/shared/lib/db";

const idSchema = z.string().trim().min(1).max(64);

interface CreateProgramResult {
  ok: boolean;
  programId?: string;
  error?: string;
  assignmentCount?: number;
  messages?: { date: string; message: string }[];
}

export async function createCleaningProgram(
  typeKey: string,
  selectedDates: string[],
): Promise<CreateProgramResult> {
  const user = await requireOwnerUser();
  if (selectedDates.length === 0) {
    return { ok: false, error: "Selecione ao menos um dia." };
  }

  if (typeKey === "weekly") {
    const validation = validateWeeklyConstraint(selectedDates);
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }
  }

  const sortedDates = [...selectedDates].sort();
  const startDate = sortedDates[0];
  const endDate = sortedDates[sortedDates.length - 1];

  const db = getDb();

  const [typeRow] = await db
    .select()
    .from(cleaningTypes)
    .where(eq(cleaningTypes.key, typeKey as "per_meeting" | "weekly" | "general"))
    .limit(1);

  if (!typeRow?.enabled) {
    return { ok: false, error: "Tipo de limpeza não encontrado ou desativado." };
  }

  const sectors = await db
    .select()
    .from(cleaningSectors)
    .where(eq(cleaningSectors.cleaningTypeKey, typeKey as "per_meeting" | "weekly" | "general"));

  const enabledSectors = sectors.filter((s) => s.enabled);

  if (enabledSectors.length === 0) {
    return { ok: false, error: "Nenhum setor ativo para este tipo de limpeza." };
  }

  const allPersons = await db.select().from(persons).where(eq(persons.cleaning, true));

  const [settings] = await db.select().from(meetingSettings).limit(1);
  const events = await db.select().from(specialEvents);
  const exceptions = await db.select().from(scheduleExceptions);

  const input: AssignmentInput = {
    typeKey: typeKey as "per_meeting" | "weekly" | "general",
    startDate,
    endDate,
    sectors: enabledSectors.map((s) => ({
      key: s.key ?? s.id,
      name: s.name,
      peopleCount: s.peopleCount,
      requiredSex: s.requiredSex,
    })),
    persons: allPersons.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      sex: p.sex as "male" | "female",
      cleaning: p.cleaning,
      familyHead: p.familyHead,
      familyMemberId: p.familyMemberId,
    })),
    midweekDay: settings?.midweekDay ?? 2,
    weekendDay: settings?.weekendDay ?? 0,
    specialEvents: events,
    scheduleExceptions: exceptions,
  };

  const { assignments, messages } = generateCleaningAssignments(input);

  const filteredAssignments = assignments.filter((a) => selectedDates.includes(a.assignmentDate));

  const programId = randomUUID();

  await db.insert(cleaningPrograms).values({
    id: programId,
    typeKey: typeKey as "per_meeting" | "weekly" | "general",
    startDate,
    endDate,
    status: "draft",
    createdBy: user.id,
  });

  if (filteredAssignments.length > 0) {
    await db.insert(cleaningAssignments).values(
      filteredAssignments.map((a) => ({
        id: randomUUID(),
        programId,
        assignmentDate: a.assignmentDate,
        sectorKey: a.sectorKey,
        sectorName: a.sectorName,
        personId: a.personId,
        personName: a.personName,
        isFamily: a.isFamily,
        sortOrder: a.sortOrder,
      })),
    );
  }

  revalidatePath("/reunioes");
  return {
    ok: true,
    programId,
    assignmentCount: filteredAssignments.length,
    messages,
  };
}

interface UpdateResult {
  ok: boolean;
  error?: string;
}

export async function updateCleaningAssignment(
  assignmentId: string,
  personId: string,
): Promise<UpdateResult> {
  await requireOwnerUser();
  const validatedId = idSchema.safeParse(assignmentId);
  if (!validatedId.success) return { ok: false, error: "ID inválido." };

  const db = getDb();

  const [existing] = await db
    .select()
    .from(cleaningAssignments)
    .where(eq(cleaningAssignments.id, assignmentId))
    .limit(1);

  if (!existing) return { ok: false, error: "Designação não encontrada." };

  const [person] = await db.select().from(persons).where(eq(persons.id, personId)).limit(1);

  if (!person) return { ok: false, error: "Pessoa não encontrada." };
  if (!person.cleaning) return { ok: false, error: "Pessoa não está habilitada para limpeza." };

  const sameDayOtherSector = await db
    .select()
    .from(cleaningAssignments)
    .where(eq(cleaningAssignments.assignmentDate, existing.assignmentDate));

  const conflict = sameDayOtherSector.find(
    (a) => a.personId === personId && a.sectorKey !== existing.sectorKey && a.id !== assignmentId,
  );
  if (conflict) {
    return {
      ok: false,
      error: `${person.firstName} ${person.lastName} já está designado(a) para o setor "${conflict.sectorName}" neste dia.`,
    };
  }

  await db
    .update(cleaningAssignments)
    .set({
      personId: person.id,
      personName: `${person.firstName} ${person.lastName}`,
      isFamily: false,
    })
    .where(eq(cleaningAssignments.id, assignmentId));

  revalidatePath("/reunioes");
  return { ok: true };
}

export async function deleteCleaningProgram(programId: string): Promise<UpdateResult> {
  await requireOwnerUser();
  const validatedId = idSchema.safeParse(programId);
  if (!validatedId.success) return { ok: false, error: "ID inválido." };

  const db = getDb();
  await db.delete(cleaningAssignments).where(eq(cleaningAssignments.programId, programId));
  await db.delete(cleaningPrograms).where(eq(cleaningPrograms.id, programId));

  revalidatePath("/reunioes");
  return { ok: true };
}

export async function updateProgramStatus(
  programId: string,
  status: "draft" | "confirmed" | "archived",
): Promise<UpdateResult> {
  await requireOwnerUser();
  const validatedId = idSchema.safeParse(programId);
  if (!validatedId.success) return { ok: false, error: "ID inválido." };

  const db = getDb();
  await db
    .update(cleaningPrograms)
    .set({ status, updatedAt: new Date() })
    .where(eq(cleaningPrograms.id, programId));

  revalidatePath("/reunioes");
  return { ok: true };
}

"use server";

import { randomUUID } from "node:crypto";
import { and, eq, gte, lte, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwnerUser } from "@/features/auth/application/session";
import {
  type AssignmentInput,
  generateCleaningAssignments,
  validateWeeklyConstraint,
} from "@/features/cleaning/domain/assign-cleaning";
import {
  CLEANING_HISTORY_DATES_PER_PERSON,
  CLEANING_HISTORY_DAYS,
  CLEANING_HISTORY_ROW_LIMIT,
  CLEANING_MAX_RANGE_DAYS,
} from "@/features/cleaning/domain/cleaning-constants";
import {
  cleaningAssignments,
  cleaningPrograms,
} from "@/features/cleaning/infrastructure/cleaning-program-schema";
import { cleaningSectors, cleaningTypes } from "@/features/cleaning/infrastructure/cleaning-schema";
import { persons } from "@/features/people/infrastructure/person-schema";
import { listPublicSpecialEvents } from "@/features/settings/application/queries";
import {
  meetingSettings,
  scheduleExceptions,
} from "@/features/settings/infrastructure/settings-schema";
import { getDb } from "@/shared/lib/db";

const idSchema = z.string().trim().min(1).max(64);

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida (usa AAAA-MM-DD).");

const createProgramSchema = z.object({
  typeKey: z.enum(["per_meeting", "weekly", "general"]),
  selectedDates: z.array(isoDateSchema).min(1, "Selecciona al menos un día.").max(400),
});

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
  const parsed = createProgramSchema.safeParse({ typeKey, selectedDates });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const validTypeKey = parsed.data.typeKey;
  const validDates = parsed.data.selectedDates;

  const user = await requireOwnerUser();

  if (validTypeKey === "weekly") {
    const validation = validateWeeklyConstraint(validDates);
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }
  }

  const sortedDates = [...validDates].sort();
  const startDate = sortedDates[0];
  const endDate = sortedDates[sortedDates.length - 1];
  const rangeDays = Math.round(
    (new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) /
      86400000,
  );
  if (rangeDays > CLEANING_MAX_RANGE_DAYS) {
    return {
      ok: false,
      error: `Período máximo de ${CLEANING_MAX_RANGE_DAYS} días por programa.`,
    };
  }

  const db = getDb();

  const [typeRow] = await db
    .select()
    .from(cleaningTypes)
    .where(eq(cleaningTypes.key, validTypeKey))
    .limit(1);

  if (!typeRow?.enabled) {
    return { ok: false, error: "Tipo de limpieza no encontrado o desactivado." };
  }

  const sectors = await db
    .select()
    .from(cleaningSectors)
    .where(eq(cleaningSectors.cleaningTypeKey, validTypeKey));

  const enabledSectors = sectors.filter((s) => s.enabled);

  if (enabledSectors.length === 0) {
    return { ok: false, error: "Ningún sector activo para este tipo de limpieza." };
  }

  const allPersons = await db.select().from(persons).where(eq(persons.cleaning, true));

  // Anti-duplicidade por semana/período: mesmo tipo não pode sobrepor período (exceto arquivados).
  // NOTA: sem transação no driver neon-http; dois owners simultâneos têm janela
  // de corrida teórica — risco baixo e aceito (a checagem se repete abaixo antes de gravar).
  const overlapping = await db
    .select({
      id: cleaningPrograms.id,
      startDate: cleaningPrograms.startDate,
      endDate: cleaningPrograms.endDate,
    })
    .from(cleaningPrograms)
    .where(
      and(
        eq(cleaningPrograms.typeKey, validTypeKey),
        lte(cleaningPrograms.startDate, endDate),
        gte(cleaningPrograms.endDate, startDate),
        ne(cleaningPrograms.status, "archived"),
      ),
    )
    .limit(1);
  if (overlapping[0]) {
    return {
      ok: false,
      error: `Ya fue creada tabla para aquella semana (${overlapping[0].startDate} — ${overlapping[0].endDate}). Elige otro período o edita la tabla existente.`,
    };
  }

  const [settings] = await db.select().from(meetingSettings).limit(1);
  // Leitura resiliente (banco pode estar sem a migração das colunas da visita).
  const events = await listPublicSpecialEvents();
  const exceptions = await db.select().from(scheduleExceptions);

  // Fairness global (espelha AssignmentHub): conta designações anteriores.
  // Sem limite superior: drafts futuros (ainda não realizados) também contam, e a
  // geração é sequencial — cada dia designado atualiza os contadores dos próximos.
  // Lê LIMITE+1 linhas para detectar truncamento e avisar em vez de silencioso.
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - CLEANING_HISTORY_DAYS);
  const sinceStr = sinceDate.toISOString().slice(0, 10);
  const recentRows = await db
    .select({
      personId: cleaningAssignments.personId,
      sectorKey: cleaningAssignments.sectorKey,
      assignmentDate: cleaningAssignments.assignmentDate,
    })
    .from(cleaningAssignments)
    .where(gte(cleaningAssignments.assignmentDate, sinceStr))
    .limit(CLEANING_HISTORY_ROW_LIMIT + 1);
  const historyTruncated = recentRows.length > CLEANING_HISTORY_ROW_LIMIT;
  const historyRows = historyTruncated
    ? recentRows.slice(0, CLEANING_HISTORY_ROW_LIMIT)
    : recentRows;
  const totalByPerson: Record<string, number> = {};
  const sectorByPerson: Record<string, Record<string, number>> = {};
  const lastDateByPerson: Record<string, string> = {};
  const datesByPerson: Record<string, string[]> = {};
  for (const row of historyRows) {
    if (!row.personId) continue;
    totalByPerson[row.personId] = (totalByPerson[row.personId] ?? 0) + 1;
    if (!sectorByPerson[row.personId]) sectorByPerson[row.personId] = {};
    sectorByPerson[row.personId][row.sectorKey] =
      (sectorByPerson[row.personId][row.sectorKey] ?? 0) + 1;
    if (!lastDateByPerson[row.personId] || row.assignmentDate > lastDateByPerson[row.personId]) {
      lastDateByPerson[row.personId] = row.assignmentDate;
    }
    if (!datesByPerson[row.personId]) datesByPerson[row.personId] = [];
    if (datesByPerson[row.personId].length < CLEANING_HISTORY_DATES_PER_PERSON)
      datesByPerson[row.personId].push(row.assignmentDate);
  }

  const input: AssignmentInput = {
    typeKey: validTypeKey,
    startDate,
    endDate,
    sectors: enabledSectors.map((s) => ({
      key: s.key ?? s.id,
      name: s.name,
      peopleCount: s.peopleCount,
      requiredSex: s.requiredSex,
      allowYoung: s.allowYoung ?? true,
    })),
    persons: allPersons.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      sex: p.sex as "male" | "female",
      cleaning: p.cleaning,
      young: p.young ?? false,
      familyHead: p.familyHead,
      familyMemberId: p.familyMemberId,
    })),
    midweekDay: settings?.midweekDay ?? 2,
    weekendDay: settings?.weekendDay ?? 0,
    specialEvents: events,
    scheduleExceptions: exceptions,
    history: { totalByPerson, sectorByPerson, lastDateByPerson, datesByPerson },
  };

  const { assignments, generatedMessages } = (() => {
    const { assignments, messages } = generateCleaningAssignments(input);
    if (historyTruncated) {
      messages.unshift({
        date: startDate,
        message: `Historial parcial: más de ${CLEANING_HISTORY_ROW_LIMIT} designaciones en ${CLEANING_HISTORY_DAYS} días; la rotación puede estar aproximada.`,
      });
    }
    return { assignments, generatedMessages: messages };
  })();

  const filteredAssignments = assignments.filter((a) => validDates.includes(a.assignmentDate));

  const programId = randomUUID();

  // Sem transação no driver neon-http: grava programa + designações e, em caso de
  // falha no segundo passo, remove o programa órfão (deleção compensatória).
  try {
    // Re-checa duplicidade imediatamente antes de gravar (reduz a janela de corrida).
    const lateOverlap = await db
      .select({
        id: cleaningPrograms.id,
        startDate: cleaningPrograms.startDate,
        endDate: cleaningPrograms.endDate,
      })
      .from(cleaningPrograms)
      .where(
        and(
          eq(cleaningPrograms.typeKey, validTypeKey),
          lte(cleaningPrograms.startDate, endDate),
          gte(cleaningPrograms.endDate, startDate),
          ne(cleaningPrograms.status, "archived"),
        ),
      )
      .limit(1);
    if (lateOverlap[0]) {
      return {
        ok: false,
        error: `Ya fue creada tabla para aquella semana (${lateOverlap[0].startDate} — ${lateOverlap[0].endDate}). Elige otro período o edita la tabla existente.`,
      };
    }

    await db.insert(cleaningPrograms).values({
      id: programId,
      typeKey: validTypeKey,
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
  } catch (error) {
    console.error("[cleaning] falha ao criar programa, revertendo", { programId, error });
    await db.delete(cleaningAssignments).where(eq(cleaningAssignments.programId, programId));
    await db.delete(cleaningPrograms).where(eq(cleaningPrograms.id, programId));
    return { ok: false, error: "No se pudo guardar el programa. Inténtalo de nuevo." };
  }

  revalidatePath("/designacoes");
  return {
    ok: true,
    programId,
    assignmentCount: filteredAssignments.length,
    messages: generatedMessages,
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
  if (!validatedId.success) return { ok: false, error: "ID no válido." };
  const validatedPerson = idSchema.safeParse(personId);
  if (!validatedPerson.success) return { ok: false, error: "Persona no válida." };

  const db = getDb();

  try {
    const [existing] = await db
      .select()
      .from(cleaningAssignments)
      .where(eq(cleaningAssignments.id, assignmentId))
      .limit(1);

    if (!existing) return { ok: false, error: "Designación no encontrada." };

    const [person] = await db.select().from(persons).where(eq(persons.id, personId)).limit(1);

    if (!person) return { ok: false, error: "Persona no encontrada." };
    if (!person.cleaning)
      return { ok: false, error: "La persona no está habilitada para limpieza." };

    // Valida sexo + jovem contra a regra do setor (troca manual é estrita, sem fallback).
    // Edição manual é permitida em qualquer status, inclusive arquivado.
    // Dupla designação manual no mesmo dia é permitida (só a geração automática evita).
    const [program] = await db
      .select()
      .from(cleaningPrograms)
      .where(eq(cleaningPrograms.id, existing.programId))
      .limit(1);
    if (program) {
      const typeSectors = await db
        .select()
        .from(cleaningSectors)
        .where(eq(cleaningSectors.cleaningTypeKey, program.typeKey));
      const sectorRule = typeSectors.find(
        (s) => (s.key ?? s.id) === existing.sectorKey || s.id === existing.sectorKey,
      );
      if (sectorRule) {
        if (sectorRule.requiredSex === "male" && person.sex !== "male") {
          return { ok: false, error: "Este sector exige hermano (masculino)." };
        }
        if (sectorRule.requiredSex === "female" && person.sex !== "female") {
          return { ok: false, error: "Este sector exige hermana (femenino)." };
        }
        if (!(sectorRule.allowYoung ?? true) && (person.young ?? false)) {
          return { ok: false, error: "Este sector exige adulto (joven no permitido)." };
        }
      }
    }

    await db
      .update(cleaningAssignments)
      .set({
        personId: person.id,
        personName: `${person.firstName} ${person.lastName}`,
        isFamily: false,
      })
      .where(eq(cleaningAssignments.id, assignmentId));
  } catch (error) {
    console.error("[cleaning] falha ao trocar designação", { assignmentId, personId, error });
    return { ok: false, error: "No se pudo actualizar. Inténtalo de nuevo." };
  }

  revalidatePath("/designacoes");
  return { ok: true };
}

export async function deleteCleaningDay(programId: string, date: string): Promise<UpdateResult> {
  await requireOwnerUser();
  const validatedId = idSchema.safeParse(programId);
  if (!validatedId.success) return { ok: false, error: "ID no válido." };
  const validatedDate = isoDateSchema.safeParse(date);
  if (!validatedDate.success) return { ok: false, error: "Fecha no válida." };

  const db = getDb();
  try {
    const [program] = await db
      .select()
      .from(cleaningPrograms)
      .where(eq(cleaningPrograms.id, programId))
      .limit(1);
    if (!program) return { ok: false, error: "Programa no encontrado." };

    await db
      .delete(cleaningAssignments)
      .where(
        and(
          eq(cleaningAssignments.programId, programId),
          eq(cleaningAssignments.assignmentDate, date),
        ),
      );
  } catch (error) {
    console.error("[cleaning] falha ao excluir dia", { programId, date, error });
    return { ok: false, error: "No se pudo eliminar el día. Inténtalo de nuevo." };
  }

  revalidatePath("/designacoes");
  return { ok: true };
}

export async function deleteCleaningProgram(programId: string): Promise<UpdateResult> {
  await requireOwnerUser();
  const validatedId = idSchema.safeParse(programId);
  if (!validatedId.success) return { ok: false, error: "ID no válido." };

  const db = getDb();
  await db.delete(cleaningAssignments).where(eq(cleaningAssignments.programId, programId));
  await db.delete(cleaningPrograms).where(eq(cleaningPrograms.id, programId));

  revalidatePath("/designacoes");
  return { ok: true };
}

export async function updateProgramStatus(
  programId: string,
  status: "draft" | "confirmed" | "archived",
): Promise<UpdateResult> {
  await requireOwnerUser();
  const validatedId = idSchema.safeParse(programId);
  if (!validatedId.success) return { ok: false, error: "ID no válido." };

  const db = getDb();
  await db
    .update(cleaningPrograms)
    .set({ status, updatedAt: new Date() })
    .where(eq(cleaningPrograms.id, programId));

  revalidatePath("/designacoes");
  return { ok: true };
}

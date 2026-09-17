"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwnerUser, requirePrivilegedUser } from "@/features/auth/application/session";
import { users } from "@/features/auth/infrastructure/user-schema";
import {
  normalizePersonValues,
  personFormSchema,
  updatePersonSchema,
  updateUserRoleSchema,
} from "@/features/people/application/person-validation";
import { persons } from "@/features/people/infrastructure/person-schema";
import { getDb } from "@/shared/lib/db";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes("unique")) {
    return "Este registro ya está vinculado a otra persona.";
  }
  return "No se pudo guardar. Inténtalo de nuevo.";
}

function checkServiceRoleConflict(elder: boolean, ministerialServant: boolean): string | null {
  if (elder && ministerialServant) {
    return "Una persona no puede ser siervo ministerial y anciano a la vez.";
  }
  return null;
}

async function assertReferencesExist(
  familyMemberId: string | null,
  userId: string | null,
): Promise<string | null> {
  const db = getDb();
  if (familyMemberId) {
    const rows = await db
      .select({ id: persons.id })
      .from(persons)
      .where(eq(persons.id, familyMemberId))
      .limit(1);
    if (!rows[0]) return "El familiar seleccionado no existe.";
  }
  if (userId) {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!rows[0]) return "El usuario seleccionado no existe.";
  }
  return null;
}

export async function createPerson(input: unknown): Promise<ActionResult> {
  const parsed = personFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los datos del formulario." };
  try {
    await requirePrivilegedUser();
  } catch {
    return { ok: false, error: "No tienes permiso para crear personas." };
  }
  const values = normalizePersonValues(parsed.data);
  const roleError = checkServiceRoleConflict(values.elder, values.ministerialServant);
  if (roleError) return { ok: false, error: roleError };
  const referenceError = await assertReferencesExist(
    values.familyMemberId ?? null,
    values.userId ?? null,
  );
  if (referenceError) return { ok: false, error: referenceError };
  try {
    await getDb()
      .insert(persons)
      .values({ ...values, id: randomUUID() });
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
  revalidatePath("/personas");
  redirect("/personas");
}

export async function updatePerson(input: unknown): Promise<ActionResult> {
  const parsed = updatePersonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los datos del formulario." };
  try {
    await requirePrivilegedUser();
  } catch {
    return { ok: false, error: "No tienes permiso para editar personas." };
  }
  const { id, ...rest } = parsed.data;
  if (rest.familyMemberId === id) {
    return { ok: false, error: "Una persona no puede ser familiar de sí misma." };
  }
  const values = normalizePersonValues({ ...rest, sex: rest.sex });
  const roleError = checkServiceRoleConflict(values.elder, values.ministerialServant);
  if (roleError) return { ok: false, error: roleError };
  const referenceError = await assertReferencesExist(
    values.familyMemberId ?? null,
    values.userId ?? null,
  );
  if (referenceError) return { ok: false, error: referenceError };
  try {
    await getDb().update(persons).set(values).where(eq(persons.id, id));
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
  revalidatePath("/personas");
  redirect("/personas");
}

export async function deletePerson(id: string): Promise<ActionResult> {
  try {
    await requirePrivilegedUser();
  } catch {
    return { ok: false, error: "No tienes permiso para eliminar personas." };
  }
  await getDb().delete(persons).where(eq(persons.id, id));
  revalidatePath("/personas");
  redirect("/personas");
}

export async function updateUserRole(input: unknown): Promise<ActionResult> {
  const parsed = updateUserRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Rol no válido." };
  let currentUserId: string;
  try {
    currentUserId = (await requireOwnerUser()).id;
  } catch {
    return { ok: false, error: "Solo el owner puede cambiar roles." };
  }
  if (parsed.data.userId === currentUserId) {
    return { ok: false, error: "No puedes cambiar tu propio rol." };
  }
  await getDb()
    .update(users)
    .set({ role: parsed.data.role })
    .where(eq(users.id, parsed.data.userId));
  revalidatePath("/personas");
  return { ok: true };
}

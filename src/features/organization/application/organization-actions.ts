"use server";

import { randomUUID } from "node:crypto";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser, requireOwnerUser } from "@/features/auth/application/session";
import {
  invitations,
  joinTokens,
  members,
  organizations,
} from "@/features/auth/infrastructure/organization-schema";
import { users } from "@/features/auth/infrastructure/user-schema";
import {
  type BasicPersonInput,
  createInvitationSchema,
  type GrantableRole,
  invitationIdSchema,
  redeemInvitationSchema,
  redeemJoinTokenSchema,
  renameOrganizationSchema,
} from "@/features/organization/application/organization-validation";
import {
  generateJoinTokenCode,
  normalizeJoinTokenCode,
} from "@/features/organization/domain/join-token";
import { persons } from "@/features/people/infrastructure/person-schema";
import { meetingSettings, SETTINGS_ID } from "@/features/settings/infrastructure/settings-schema";
import { getDb } from "@/shared/lib/db";

export interface OrganizationActionResult {
  ok: boolean;
  error?: string;
  code?: string;
  expiresAt?: string;
  userName?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const INVITATION_TTL_MS = 7 * DAY_MS;
const JOIN_TOKEN_TTL_MS = 7 * DAY_MS;
const CONGREGATION_ORG_SLUG = "congregation";

function revalidateAdminPages() {
  revalidatePath("/administracion");
  revalidatePath("/administracion/configuracion");
  revalidatePath("/administracion/personas");
  revalidatePath("/");
}

function isUniqueViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("unique");
}

/**
 * Organização = congregação (app de congregação única). Cria na primeira vez
 * que um fluxo precisa dela e mantém o nome alinhado ao da congregação.
 */
async function ensureCongregationOrganization(name?: string): Promise<string> {
  const db = getDb();
  const rows = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.slug, CONGREGATION_ORG_SLUG))
    .limit(1);
  const existing = rows[0];
  if (existing) {
    if (name && name !== "" && name !== existing.name) {
      await db.update(organizations).set({ name }).where(eq(organizations.id, existing.id));
    }
    return existing.id;
  }
  const id = randomUUID();
  await db
    .insert(organizations)
    .values({ id, name: name && name !== "" ? name : "Congregación", slug: CONGREGATION_ORG_SLUG });
  return id;
}

/**
 * Resolve o vínculo obrigatório da admissão: vincula uma pessoa livre ao
 * usuário ou cria uma nova com os dados básicos. Erros em espanhol para a UI.
 */
async function resolveAdmitPerson(
  targetUserId: string,
  link: { personId?: string; newPerson?: BasicPersonInput },
): Promise<{ ok: true; personName: string } | { ok: false; error: string }> {
  const db = getDb();
  if (link.personId) {
    const rows = await db
      .select({
        id: persons.id,
        firstName: persons.firstName,
        lastName: persons.lastName,
        userId: persons.userId,
      })
      .from(persons)
      .where(eq(persons.id, link.personId))
      .limit(1);
    const person = rows[0];
    if (!person) return { ok: false, error: "Persona no encontrada." };
    if (person.userId && person.userId !== targetUserId)
      return { ok: false, error: "Esa persona ya está vinculada a otro usuario." };
    if (person.userId !== targetUserId) {
      await db.update(persons).set({ userId: targetUserId }).where(eq(persons.id, person.id));
    }
    return { ok: true, personName: `${person.firstName} ${person.lastName}` };
  }
  if (link.newPerson) {
    const { firstName, lastName, sex, young } = link.newPerson;
    await db.insert(persons).values({
      id: randomUUID(),
      firstName,
      lastName,
      sex,
      young,
      userId: targetUserId,
    });
    return { ok: true, personName: `${firstName} ${lastName}` };
  }
  return { ok: false, error: "Elige una persona existente o crea una nueva para admitir." };
}

/**
 * Registra o vínculo do usuário à organização (a associação). Chamado só nos
 * fluxos explícitos de admissão (convite, código, troca de papel pelo owner):
 * nunca automaticamente no login.
 */
export async function upsertMembership(userId: string, role: string): Promise<void> {
  const organizationId = await ensureCongregationOrganization();
  const db = getDb();
  const existing = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.organizationId, organizationId), eq(members.userId, userId)))
    .limit(1);
  if (existing[0]) {
    await db.update(members).set({ role }).where(eq(members.id, existing[0].id));
  } else {
    await db.insert(members).values({ id: randomUUID(), organizationId, userId, role });
  }
}

/** Renomeia a organização: o nome exibido no cabeçalho, programa e PDFs. */
export async function renameOrganization(input: unknown): Promise<OrganizationActionResult> {
  const parsed = renameOrganizationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa el nombre informado." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo el owner puede cambiar el nombre." };
  }
  const name = parsed.data.name;
  const db = getDb();
  await db
    .insert(meetingSettings)
    .values({ id: SETTINGS_ID, congregationName: name })
    .onConflictDoUpdate({
      target: meetingSettings.id,
      set: { congregationName: name, updatedAt: new Date() },
    });
  await ensureCongregationOrganization(name);
  revalidateAdminPages();
  return { ok: true };
}

/** Convida por e-mail com papel de admin ou membro (owner nunca por convite). */
export async function createInvitation(input: unknown): Promise<OrganizationActionResult> {
  const parsed = createInvitationSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { ok: false, error: firstIssue?.message ?? "Revisa los datos de la invitación." };
  }
  let ownerId: string;
  let ownerEmail: string;
  try {
    const owner = await requireOwnerUser();
    ownerId = owner.id;
    ownerEmail = owner.email.toLowerCase();
  } catch {
    return { ok: false, error: "Solo el owner puede invitar." };
  }
  const { email, role } = parsed.data;
  if (email === ownerEmail) return { ok: false, error: "No puedes invitarte a ti mismo." };
  const db = getDb();
  const duplicated = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(and(eq(invitations.email, email), eq(invitations.status, "pending")))
    .limit(1);
  if (duplicated[0])
    return { ok: false, error: "Ya hay una invitación pendiente para ese correo." };
  const existing = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(ilike(users.email, email))
    .limit(1);
  if (existing[0]?.role === "owner")
    return { ok: false, error: "Ese correo ya es owner de la organización." };
  if (existing[0]?.role === role) return { ok: false, error: "Ese usuario ya tiene ese rol." };
  const organizationId = await ensureCongregationOrganization();
  await db.insert(invitations).values({
    id: randomUUID(),
    organizationId,
    email,
    role,
    status: "pending",
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    inviterId: ownerId,
  });
  revalidateAdminPages();
  return { ok: true };
}

export async function cancelInvitation(input: unknown): Promise<OrganizationActionResult> {
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invitación no válida." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo el owner puede cancelar invitaciones." };
  }
  await getDb().delete(invitations).where(eq(invitations.id, parsed.data.id));
  revalidateAdminPages();
  return { ok: true };
}

function toGrantableRole(value: string): GrantableRole {
  return value === "admin" ? "admin" : "member";
}

interface InvitationRow {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Date;
}

async function findInvitationById(id: string): Promise<InvitationRow | undefined> {
  const rows = await getDb()
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(eq(invitations.id, id))
    .limit(1);
  return rows[0];
}

/**
 * Reenvia um convite vencido com um clique: renova a validade por mais 7 dias
 * mantendo e-mail e papel. Convite ainda válido não precisa de reenvio.
 */
export async function resendInvitation(input: unknown): Promise<OrganizationActionResult> {
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invitación no válida." };
  try {
    await requireOwnerUser();
  } catch {
    return { ok: false, error: "Solo el owner puede reenviar invitaciones." };
  }
  const invite = await findInvitationById(parsed.data.id);
  if (!invite) return { ok: false, error: "Invitación no encontrada." };
  if (invite.status !== "pending") return { ok: false, error: "Esta invitación ya fue usada." };
  if (new Date(invite.expiresAt) > new Date())
    return { ok: false, error: "Esta invitación aún es válida." };
  await getDb()
    .update(invitations)
    .set({ expiresAt: new Date(Date.now() + INVITATION_TTL_MS) })
    .where(eq(invitations.id, invite.id));
  revalidateAdminPages();
  return { ok: true };
}

/**
 * Admite um convidado: exige conta logada, aplica o papel do convite e vincula
 * obrigatoriamente uma pessoa (existente livre ou nova básica). Nunca altera o
 * próprio papel do owner.
 */
export async function redeemInvitation(input: unknown): Promise<OrganizationActionResult> {
  const parsed = redeemInvitationSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { ok: false, error: firstIssue?.message ?? "Revisa los datos para admitir." };
  }
  let ownerId: string;
  try {
    ownerId = (await requireOwnerUser()).id;
  } catch {
    return { ok: false, error: "Solo el owner puede admitir." };
  }
  const db = getDb();
  const invite = await findInvitationById(parsed.data.id);
  if (!invite) return { ok: false, error: "Invitación no encontrada." };
  if (invite.status !== "pending") return { ok: false, error: "Esta invitación ya fue usada." };
  if (new Date(invite.expiresAt) <= new Date())
    return { ok: false, error: "Esta invitación venció. Crea una nueva." };
  const userRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(ilike(users.email, invite.email))
    .limit(1);
  const target = userRows[0];
  if (!target) return { ok: false, error: "Esa cuenta aún no inició sesión con Google." };
  if (target.id === ownerId) return { ok: false, error: "No puedes cambiar tu propio rol." };
  const person = await resolveAdmitPerson(target.id, {
    personId: parsed.data.personId,
    newPerson: parsed.data.newPerson,
  });
  if (!person.ok) return person;
  const grantedRole = toGrantableRole(invite.role ?? "member");
  await db.update(users).set({ role: grantedRole }).where(eq(users.id, target.id));
  await db.update(invitations).set({ status: "accepted" }).where(eq(invitations.id, invite.id));
  await upsertMembership(target.id, grantedRole);
  revalidateAdminPages();
  return { ok: true, userName: target.name };
}

/**
 * Gera (ou substitui) o código de entrada do usuário logado. O usuário mostra
 * o código ao owner, que o resgata no hub. Só vale um código ativo por vez.
 */
export async function createJoinToken(): Promise<OrganizationActionResult> {
  let userId: string;
  try {
    userId = (await requireAuthenticatedUser()).id;
  } catch {
    return { ok: false, error: "Inicia sesión para generar tu código." };
  }
  const db = getDb();
  await db.delete(joinTokens).where(and(eq(joinTokens.userId, userId), isNull(joinTokens.usedAt)));
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateJoinTokenCode();
    const expiresAt = new Date(Date.now() + JOIN_TOKEN_TTL_MS);
    try {
      await db.insert(joinTokens).values({ id: randomUUID(), code, userId, expiresAt });
      revalidatePath("/");
      revalidatePath("/administracion");
      return { ok: true, code, expiresAt: expiresAt.toISOString() };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  return { ok: false, error: "No se pudo generar el código. Inténtalo de nuevo." };
}

/**
 * Resgata um código de entrada: admite o dono do código com o papel escolhido
 * (admin ou membro), vincula obrigatoriamente uma pessoa e marca o código como
 * usado. Uso único.
 */
export async function redeemJoinToken(input: unknown): Promise<OrganizationActionResult> {
  const parsed = redeemJoinTokenSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { ok: false, error: firstIssue?.message ?? "Revisa el código informado." };
  }
  let ownerId: string;
  try {
    ownerId = (await requireOwnerUser()).id;
  } catch {
    return { ok: false, error: "Solo el owner puede admitir." };
  }
  const code = normalizeJoinTokenCode(parsed.data.code);
  const db = getDb();
  const tokenRows = await db
    .select({
      id: joinTokens.id,
      userId: joinTokens.userId,
      usedAt: joinTokens.usedAt,
      expiresAt: joinTokens.expiresAt,
      userName: users.name,
    })
    .from(joinTokens)
    .innerJoin(users, eq(users.id, joinTokens.userId))
    .where(eq(joinTokens.code, code))
    .limit(1);
  const token = tokenRows[0];
  if (!token) return { ok: false, error: "Código no encontrado." };
  if (token.usedAt !== null) return { ok: false, error: "Este código ya fue usado." };
  if (new Date(token.expiresAt) <= new Date())
    return { ok: false, error: "Este código venció. Pide uno nuevo." };
  if (token.userId === ownerId) return { ok: false, error: "No puedes cambiar tu propio rol." };
  const person = await resolveAdmitPerson(token.userId, {
    personId: parsed.data.personId,
    newPerson: parsed.data.newPerson,
  });
  if (!person.ok) return person;
  await db.update(users).set({ role: parsed.data.role }).where(eq(users.id, token.userId));
  await db.update(joinTokens).set({ usedAt: new Date() }).where(eq(joinTokens.id, token.id));
  await upsertMembership(token.userId, parsed.data.role);
  revalidateAdminPages();
  return { ok: true, userName: token.userName };
}

/**
 * O usuário sai da organização por conta própria: perde o vínculo e volta a
 * membro. O owner não pode sair (órfão sem admin). Redireciona às boas-vindas.
 */
export async function leaveOrganization(): Promise<OrganizationActionResult> {
  let user: { id: string; role: string };
  try {
    user = await requireAuthenticatedUser();
  } catch {
    return { ok: false, error: "Inicia sesión para salir." };
  }
  if (user.role === "owner")
    return { ok: false, error: "El owner no puede salir de la organización." };
  const db = getDb();
  await db.delete(members).where(eq(members.userId, user.id));
  await db.update(users).set({ role: "member" }).where(eq(users.id, user.id));
  revalidateAdminPages();
  revalidatePath("/perfil");
  redirect("/bienvenida");
}

/**
 * O owner remove um usuário da organização: apaga o vínculo e rebaixa a
 * membro (volta às boas-vindas até ser admitido de novo). Nunca a si mesmo.
 */
export async function removeUserFromOrganization(
  input: unknown,
): Promise<OrganizationActionResult> {
  // Reaproveita o schema de id (1–64 chars): aqui o id é o do usuário.
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Usuario no válido." };
  let ownerId: string;
  try {
    ownerId = (await requireOwnerUser()).id;
  } catch {
    return { ok: false, error: "Solo el owner puede remover usuarios." };
  }
  const targetId = parsed.data.id;
  if (targetId === ownerId) return { ok: false, error: "No puedes removerte a ti mismo." };
  const db = getDb();
  const targetRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);
  const target = targetRows[0];
  if (!target) return { ok: false, error: "Usuario no encontrado." };
  await db.delete(members).where(eq(members.userId, target.id));
  await db.update(users).set({ role: "member" }).where(eq(users.id, target.id));
  revalidateAdminPages();
  return { ok: true, userName: target.name };
}

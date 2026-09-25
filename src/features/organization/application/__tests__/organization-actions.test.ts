import { mockDb } from "@test/mock-db";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAuthenticatedUser, requireOwnerUser } from "@/features/auth/application/session";
import {
  cancelInvitation,
  createInvitation,
  createJoinToken,
  leaveOrganization,
  redeemInvitation,
  redeemJoinToken,
  removeUserFromOrganization,
  renameOrganization,
  resendInvitation,
} from "@/features/organization/application/organization-actions";
import { JOIN_TOKEN_CODE_PATTERN } from "@/features/organization/domain/join-token";

vi.mock("@/shared/lib/db", async () => {
  const { mockDb } = await import("@test/mock-db");
  return { getDb: () => mockDb.database };
});

vi.mock("@/features/auth/application/session", () => ({
  getCurrentUser: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  requirePrivilegedUser: vi.fn(),
  requireOwnerUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

const owner = { id: "u1", email: "owner@example.com", name: "Owner", role: "owner" as const };
const member = { id: "u2", email: "ana@example.com", name: "Ana", role: "member" as const };

const future = new Date(Date.now() + 86400000);
const past = new Date(Date.now() - 86400000);

function pendingInvite(overrides = {}) {
  return {
    id: "inv1",
    email: "ana@example.com",
    role: "member",
    status: "pending",
    expiresAt: future,
    ...overrides,
  };
}

beforeEach(() => {
  mockDb.reset();
  vi.mocked(requireOwnerUser).mockReset();
  vi.mocked(requireAuthenticatedUser).mockReset();
  vi.mocked(revalidatePath).mockReset();
  vi.mocked(requireOwnerUser).mockResolvedValue(owner);
  vi.mocked(requireAuthenticatedUser).mockResolvedValue(member);
});

describe("renameOrganization", () => {
  it("rechaza el nombre inválido sin tocar el banco", async () => {
    const result = await renameOrganization({ name: "" });
    expect(result).toEqual({ ok: false, error: "Revisa el nombre informado." });
    expect(mockDb.calls).toHaveLength(0);
  });

  it("rechaza sin permiso de owner", async () => {
    vi.mocked(requireOwnerUser).mockRejectedValueOnce(new Error("FORBIDDEN"));
    const result = await renameOrganization({ name: "Norte" });
    expect(result).toEqual({ ok: false, error: "Solo el owner puede cambiar el nombre." });
    expect(mockDb.calls).toHaveLength(0);
  });

  it("renombra y crea la organización cuando falta", async () => {
    mockDb.enqueueMany([[], []]);
    const result = await renameOrganization({ name: "Cong. Norte" });
    expect(result).toEqual({ ok: true });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/administracion");
  });
});

describe("createInvitation", () => {
  it("rechaza el correo inválido", async () => {
    const result = await createInvitation({ email: "no-es-correo", role: "member" });
    expect(result.ok).toBe(false);
    expect(mockDb.calls).toHaveLength(0);
  });

  it("rechaza sin permiso de owner", async () => {
    vi.mocked(requireOwnerUser).mockRejectedValueOnce(new Error("FORBIDDEN"));
    const result = await createInvitation({ email: "ana@example.com", role: "member" });
    expect(result).toEqual({ ok: false, error: "Solo el owner puede invitar." });
  });

  it("rechaza invitarse a sí mismo", async () => {
    const result = await createInvitation({ email: "OWNER@example.com", role: "admin" });
    expect(result).toEqual({ ok: false, error: "No puedes invitarte a ti mismo." });
    expect(mockDb.calls).toHaveLength(0);
  });

  it("rechaza duplicar una invitación pendiente", async () => {
    mockDb.enqueue([{ id: "inv0" }]);
    const result = await createInvitation({ email: "ana@example.com", role: "member" });
    expect(result).toEqual({
      ok: false,
      error: "Ya hay una invitación pendiente para ese correo.",
    });
  });

  it("rechaza invitar a quien ya es owner", async () => {
    mockDb.enqueueMany([[], [{ id: "u9", role: "owner" }]]);
    const result = await createInvitation({ email: "jefe@example.com", role: "admin" });
    expect(result).toEqual({ ok: false, error: "Ese correo ya es owner de la organización." });
  });

  it("crea la invitación cuando no hay cuenta ni duplicada", async () => {
    mockDb.enqueueMany([[], [], [], []]);
    const result = await createInvitation({ email: "nueva@example.com", role: "admin" });
    expect(result).toEqual({ ok: true });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/administracion");
  });
});

describe("cancelInvitation", () => {
  it("rechaza el id inválido", async () => {
    const result = await cancelInvitation({ id: "" });
    expect(result.ok).toBe(false);
    expect(mockDb.calls).toHaveLength(0);
  });

  it("cancela con permiso de owner", async () => {
    mockDb.enqueue([]);
    const result = await cancelInvitation({ id: "inv1" });
    expect(result).toEqual({ ok: true });
  });
});

describe("resendInvitation", () => {
  it("rechaza el id inválido", async () => {
    const result = await resendInvitation({ id: "" });
    expect(result.ok).toBe(false);
    expect(mockDb.calls).toHaveLength(0);
  });

  it("rechaza sin permiso de owner", async () => {
    vi.mocked(requireOwnerUser).mockRejectedValueOnce(new Error("FORBIDDEN"));
    const result = await resendInvitation({ id: "inv1" });
    expect(result).toEqual({ ok: false, error: "Solo el owner puede reenviar invitaciones." });
  });

  it("rechaza la invitación inexistente o ya usada", async () => {
    mockDb.enqueue([]);
    expect(await resendInvitation({ id: "inv9" })).toEqual({
      ok: false,
      error: "Invitación no encontrada.",
    });
    mockDb.enqueue([{ ...pendingInvite(), status: "accepted" }]);
    expect(await resendInvitation({ id: "inv1" })).toEqual({
      ok: false,
      error: "Esta invitación ya fue usada.",
    });
  });

  it("rechaza reenviar la invitación aún válida", async () => {
    mockDb.enqueue([pendingInvite()]);
    const result = await resendInvitation({ id: "inv1" });
    expect(result).toEqual({ ok: false, error: "Esta invitación aún es válida." });
  });

  it("renueva la validez del convite vencido", async () => {
    mockDb.enqueueMany([[{ ...pendingInvite(), expiresAt: past }], []]);
    const result = await resendInvitation({ id: "inv1" });
    expect(result).toEqual({ ok: true });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/administracion");
  });
});

describe("redeemInvitation", () => {
  it("exige vincular uma pessoa na admissão", async () => {
    const result = await redeemInvitation({ id: "inv1" });
    expect(result).toEqual({
      ok: false,
      error: "Elige una persona existente o crea una nueva para admitir.",
    });
    expect(mockDb.calls).toHaveLength(0);
  });

  it("rechaza la invitación inexistente", async () => {
    mockDb.enqueue([]);
    const result = await redeemInvitation({ id: "inv9", personId: "p1" });
    expect(result).toEqual({ ok: false, error: "Invitación no encontrada." });
  });

  it("rechaza la invitación ya usada o vencida", async () => {
    mockDb.enqueue([{ ...pendingInvite(), status: "accepted" }]);
    expect(await redeemInvitation({ id: "inv1", personId: "p1" })).toEqual({
      ok: false,
      error: "Esta invitación ya fue usada.",
    });
    mockDb.enqueue([{ ...pendingInvite(), expiresAt: past }]);
    expect(await redeemInvitation({ id: "inv1", personId: "p1" })).toEqual({
      ok: false,
      error: "Esta invitación venció. Crea una nueva.",
    });
  });

  it("exige que la cuenta ya haya iniciado sesión", async () => {
    mockDb.enqueueMany([[pendingInvite()], []]);
    const result = await redeemInvitation({ id: "inv1", personId: "p1" });
    expect(result).toEqual({ ok: false, error: "Esa cuenta aún no inició sesión con Google." });
  });

  it("rechaza pessoa inexistente ou vinculada a outro", async () => {
    mockDb.enqueueMany([[pendingInvite()], [{ id: "u2", name: "Ana" }], []]);
    expect(await redeemInvitation({ id: "inv1", personId: "p9" })).toEqual({
      ok: false,
      error: "Persona no encontrada.",
    });
    mockDb.enqueueMany([
      [pendingInvite()],
      [{ id: "u2", name: "Ana" }],
      [{ id: "p1", firstName: "Juan", lastName: "Pérez", userId: "u9" }],
    ]);
    expect(await redeemInvitation({ id: "inv1", personId: "p1" })).toEqual({
      ok: false,
      error: "Esa persona ya está vinculada a otro usuario.",
    });
  });

  it("admite aplicando el rol del convite e vinculando a pessoa", async () => {
    mockDb.enqueueMany([
      [pendingInvite()],
      [{ id: "u2", name: "Ana" }],
      [{ id: "p1", firstName: "Juan", lastName: "Pérez", userId: null }],
      [],
      [],
      [],
      [{ id: "org1", name: "Cong" }],
      [],
      [],
    ]);
    const result = await redeemInvitation({ id: "inv1", personId: "p1" });
    expect(result).toEqual({ ok: true, userName: "Ana" });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/administracion/personas");
  });

  it("admite criando a pessoa básica", async () => {
    mockDb.enqueueMany([
      [pendingInvite()],
      [{ id: "u2", name: "Ana" }],
      [],
      [],
      [],
      [{ id: "org1", name: "Cong" }],
      [],
      [],
    ]);
    const result = await redeemInvitation({
      id: "inv1",
      newPerson: { firstName: "Ana", lastName: "Paz", sex: "female", young: false },
    });
    expect(result).toEqual({ ok: true, userName: "Ana" });
  });
});

describe("createJoinToken", () => {
  it("exige sesión para generar el código", async () => {
    vi.mocked(requireAuthenticatedUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"));
    const result = await createJoinToken();
    expect(result).toEqual({ ok: false, error: "Inicia sesión para generar tu código." });
  });

  it("genera un código XXX-XXX-XXX", async () => {
    mockDb.enqueueMany([[], []]);
    const result = await createJoinToken();
    expect(result.ok).toBe(true);
    expect(result.code).toMatch(JOIN_TOKEN_CODE_PATTERN);
    expect(typeof result.expiresAt).toBe("string");
  });
});

describe("redeemJoinToken", () => {
  it("rechaza el formato inválido sin tocar el banco", async () => {
    const result = await redeemJoinToken({ code: "curto", role: "member", personId: "p1" });
    expect(result.ok).toBe(false);
    expect(mockDb.calls).toHaveLength(0);
  });

  it("exige vincular uma pessoa na admissão", async () => {
    const result = await redeemJoinToken({ code: "ABC-DEF-GHJ", role: "member" });
    expect(result).toEqual({
      ok: false,
      error: "Elige una persona existente o crea una nueva para admitir.",
    });
    expect(mockDb.calls).toHaveLength(0);
  });

  it("rechaza el código inexistente, usado o vencido", async () => {
    mockDb.enqueue([]);
    expect(await redeemJoinToken({ code: "ABC-DEF-GHJ", role: "member", personId: "p1" })).toEqual({
      ok: false,
      error: "Código no encontrado.",
    });
    mockDb.enqueue([{ id: "t1", userId: "u2", usedAt: new Date(), expiresAt: future }]);
    expect(await redeemJoinToken({ code: "ABC-DEF-GHJ", role: "member", personId: "p1" })).toEqual({
      ok: false,
      error: "Este código ya fue usado.",
    });
    mockDb.enqueue([{ id: "t1", userId: "u2", usedAt: null, expiresAt: past }]);
    expect(await redeemJoinToken({ code: "ABC-DEF-GHJ", role: "member", personId: "p1" })).toEqual({
      ok: false,
      error: "Este código venció. Pide uno nuevo.",
    });
  });

  it("admite con el rol elegido en un solo uso", async () => {
    mockDb.enqueueMany([
      [{ id: "t1", userId: "u2", usedAt: null, expiresAt: future, userName: "Ana" }],
      [{ id: "p1", firstName: "Juan", lastName: "Pérez", userId: null }],
      [],
      [],
      [],
      [{ id: "org1", name: "Cong" }],
      [],
      [],
    ]);
    const result = await redeemJoinToken({ code: "abc-def-ghj", role: "admin", personId: "p1" });
    expect(result).toEqual({ ok: true, userName: "Ana" });
  });

  it("rechaza pessoa vinculada a outro usuário", async () => {
    mockDb.enqueueMany([
      [{ id: "t1", userId: "u2", usedAt: null, expiresAt: future, userName: "Ana" }],
      [{ id: "p1", firstName: "Juan", lastName: "Pérez", userId: "u9" }],
    ]);
    const result = await redeemJoinToken({ code: "abc-def-ghj", role: "member", personId: "p1" });
    expect(result).toEqual({
      ok: false,
      error: "Esa persona ya está vinculada a otro usuario.",
    });
  });
});

describe("leaveOrganization", () => {
  it("exige sesión", async () => {
    vi.mocked(requireAuthenticatedUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"));
    const result = await leaveOrganization();
    expect(result).toEqual({ ok: false, error: "Inicia sesión para salir." });
    expect(mockDb.calls).toHaveLength(0);
  });

  it("impide que el owner salga", async () => {
    vi.mocked(requireAuthenticatedUser).mockResolvedValueOnce(owner);
    const result = await leaveOrganization();
    expect(result).toEqual({ ok: false, error: "El owner no puede salir de la organización." });
    expect(mockDb.calls).toHaveLength(0);
  });

  it("apaga o vínculo, rebaixa a membro e vai às boas-vindas", async () => {
    mockDb.enqueueMany([[], []]);
    await expect(leaveOrganization()).rejects.toThrow("NEXT_REDIRECT:/bienvenida");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/perfil");
  });
});

describe("removeUserFromOrganization", () => {
  it("rechaza id inválido e sem permissão", async () => {
    expect(await removeUserFromOrganization({ id: "" })).toEqual({
      ok: false,
      error: "Usuario no válido.",
    });
    vi.mocked(requireOwnerUser).mockRejectedValueOnce(new Error("FORBIDDEN"));
    expect(await removeUserFromOrganization({ id: "u2" })).toEqual({
      ok: false,
      error: "Solo el owner puede remover usuarios.",
    });
  });

  it("impide remover a si mesmo e quem não existe", async () => {
    expect(await removeUserFromOrganization({ id: "u1" })).toEqual({
      ok: false,
      error: "No puedes removerte a ti mismo.",
    });
    mockDb.enqueue([]);
    expect(await removeUserFromOrganization({ id: "u9" })).toEqual({
      ok: false,
      error: "Usuario no encontrado.",
    });
  });

  it("apaga o vínculo e rebaixa a membro", async () => {
    mockDb.enqueueMany([[{ id: "u2", name: "Ana" }], [], []]);
    const result = await removeUserFromOrganization({ id: "u2" });
    expect(result).toEqual({ ok: true, userName: "Ana" });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/administracion/personas");
  });
});

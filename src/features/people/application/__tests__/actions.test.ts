import { mockDb } from "@test/mock-db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireOwnerUser, requirePrivilegedUser } from "@/features/auth/application/session";
import {
  createPerson,
  deletePerson,
  updatePerson,
  updateUserRole,
} from "@/features/people/application/actions";
import {
  DEFAULT_PERSON_FORM,
  type PersonFormValues,
} from "@/features/people/application/person-validation";

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
  redirect: vi.fn(),
}));

const fakeUser = {
  id: "u1",
  email: "owner@example.com",
  name: "Owner",
  role: "owner" as const,
};

function validForm(overrides: Partial<PersonFormValues> & { id?: string } = {}): PersonFormValues {
  return { ...DEFAULT_PERSON_FORM, firstName: "Ana", lastName: "Pérez", ...overrides };
}

function rejected(reason: unknown): Promise<unknown> {
  return Promise.resolve().then(() => {
    throw reason;
  });
}

function callsOf(fn: string) {
  return mockDb.calls.filter((call) => call.fn === fn);
}

beforeEach(() => {
  mockDb.reset();
  vi.mocked(requirePrivilegedUser).mockReset();
  vi.mocked(requireOwnerUser).mockReset();
  vi.mocked(revalidatePath).mockReset();
  vi.mocked(redirect).mockReset();
  vi.mocked(requirePrivilegedUser).mockResolvedValue(fakeUser);
  vi.mocked(requireOwnerUser).mockResolvedValue(fakeUser);
  vi.mocked(redirect).mockImplementation(() => {
    throw new Error("NEXT_REDIRECT:/personas");
  });
});

describe("createPerson", () => {
  it("rechaza el formulario inválido sin pedir permiso", async () => {
    const result = await createPerson(validForm({ firstName: "" }));

    expect(result).toEqual({ ok: false, error: "Revisa los datos del formulario." });
    expect(vi.mocked(requirePrivilegedUser)).not.toHaveBeenCalled();
    expect(mockDb.calls).toHaveLength(0);
  });

  it("rechaza sin permiso para crear personas", async () => {
    vi.mocked(requirePrivilegedUser).mockRejectedValueOnce(new Error("FORBIDDEN"));

    const result = await createPerson(validForm());

    expect(result).toEqual({ ok: false, error: "No tienes permiso para crear personas." });
    expect(callsOf("insert")).toHaveLength(0);
  });

  it("rechaza ser anciano y siervo ministerial a la vez", async () => {
    const result = await createPerson(
      validForm({ sex: "male", baptized: true, elder: true, ministerialServant: true }),
    );

    expect(result).toEqual({
      ok: false,
      error: "Una persona no puede ser siervo ministerial y anciano a la vez.",
    });
    expect(callsOf("insert")).toHaveLength(0);
  });

  it("rechaza un familiar inexistente", async () => {
    mockDb.enqueue([]);

    const result = await createPerson(validForm({ familyMemberId: "f9" }));

    expect(result).toEqual({ ok: false, error: "El familiar seleccionado no existe." });
    expect(callsOf("insert")).toHaveLength(0);
  });

  it("rechaza un usuario inexistente", async () => {
    mockDb.enqueue([]);

    const result = await createPerson(validForm({ userId: "u9" }));

    expect(result).toEqual({ ok: false, error: "El usuario seleccionado no existe." });
    expect(callsOf("insert")).toHaveLength(0);
  });

  it("crea la persona con las referencias validadas y redirige", async () => {
    mockDb.enqueueMany([[{ id: "f1" }], [{ id: "u1" }], []]);

    await expect(
      createPerson(validForm({ sex: "female", elder: true, familyMemberId: "f1", userId: "u1" })),
    ).rejects.toThrow("NEXT_REDIRECT:/personas");

    const values = callsOf("values")[0].args[0] as Record<string, unknown>;
    expect(values).toMatchObject({
      firstName: "Ana",
      lastName: "Pérez",
      sex: "female",
      elder: false,
      familyMemberId: "f1",
      userId: "u1",
    });
    expect(typeof values.id).toBe("string");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/personas");
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/personas");
  });

  it("devuelve error de duplicado cuando la base rechaza el registro", async () => {
    mockDb.enqueue(rejected(new Error("violación de unique constraint")));

    const result = await createPerson(validForm());

    expect(result).toEqual({
      ok: false,
      error: "Este registro ya está vinculado a otra persona.",
    });
  });

  it("devuelve error genérico cuando la inserción falla", async () => {
    mockDb.enqueue(rejected(new Error("conexión perdida")));

    const result = await createPerson(validForm());

    expect(result).toEqual({ ok: false, error: "No se pudo guardar. Inténtalo de nuevo." });
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });
});

describe("updatePerson", () => {
  it("rechaza el formulario sin id", async () => {
    const result = await updatePerson(validForm());

    expect(result).toEqual({ ok: false, error: "Revisa los datos del formulario." });
    expect(vi.mocked(requirePrivilegedUser)).not.toHaveBeenCalled();
  });

  it("rechaza sin permiso para editar personas", async () => {
    vi.mocked(requirePrivilegedUser).mockRejectedValueOnce(new Error("FORBIDDEN"));

    const result = await updatePerson(validForm({ id: "p1" }));

    expect(result).toEqual({ ok: false, error: "No tienes permiso para editar personas." });
    expect(callsOf("update")).toHaveLength(0);
  });

  it("rechaza que la persona sea familiar de sí misma", async () => {
    const result = await updatePerson(validForm({ id: "p1", familyMemberId: "p1" }));

    expect(result).toEqual({ ok: false, error: "Una persona no puede ser familiar de sí misma." });
    expect(callsOf("update")).toHaveLength(0);
  });

  it("rechaza ser anciano y siervo ministerial a la vez", async () => {
    const result = await updatePerson(
      validForm({ id: "p1", sex: "male", baptized: true, elder: true, ministerialServant: true }),
    );

    expect(result).toEqual({
      ok: false,
      error: "Una persona no puede ser siervo ministerial y anciano a la vez.",
    });
  });

  it("rechaza un familiar inexistente", async () => {
    mockDb.enqueue([]);

    const result = await updatePerson(validForm({ id: "p1", familyMemberId: "f9" }));

    expect(result).toEqual({ ok: false, error: "El familiar seleccionado no existe." });
    expect(callsOf("update")).toHaveLength(0);
  });

  it("actualiza la persona sin tocar el id y redirige", async () => {
    mockDb.enqueue([[]]);

    await expect(updatePerson(validForm({ id: "p1" }))).rejects.toThrow("NEXT_REDIRECT:/personas");

    const values = callsOf("set")[0].args[0] as Record<string, unknown>;
    expect(values).toMatchObject({ firstName: "Ana", lastName: "Pérez" });
    expect(values).not.toHaveProperty("id");
    expect(callsOf("where")).toHaveLength(1);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/personas");
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/personas");
  });
});

describe("deletePerson", () => {
  it("rechaza sin permiso para eliminar personas", async () => {
    vi.mocked(requirePrivilegedUser).mockRejectedValueOnce(new Error("FORBIDDEN"));

    const result = await deletePerson("p1");

    expect(result).toEqual({ ok: false, error: "No tienes permiso para eliminar personas." });
    expect(callsOf("delete")).toHaveLength(0);
  });

  it("elimina la persona y redirige", async () => {
    mockDb.enqueue([]);

    await expect(deletePerson("p1")).rejects.toThrow("NEXT_REDIRECT:/personas");

    expect(callsOf("delete")).toHaveLength(1);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/personas");
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/personas");
  });
});

describe("updateUserRole", () => {
  it("rechaza el rol inválido", async () => {
    const result = await updateUserRole({ userId: "u2", role: "superuser" });

    expect(result).toEqual({ ok: false, error: "Rol no válido." });
    expect(vi.mocked(requireOwnerUser)).not.toHaveBeenCalled();
  });

  it("rechaza sin permiso de owner", async () => {
    vi.mocked(requireOwnerUser).mockRejectedValueOnce(new Error("FORBIDDEN"));

    const result = await updateUserRole({ userId: "u2", role: "admin" });

    expect(result).toEqual({ ok: false, error: "Solo el owner puede cambiar roles." });
    expect(callsOf("update")).toHaveLength(0);
  });

  it("rechaza cambiar el rol propio", async () => {
    const result = await updateUserRole({ userId: fakeUser.id, role: "admin" });

    expect(result).toEqual({ ok: false, error: "No puedes cambiar tu propio rol." });
    expect(callsOf("update")).toHaveLength(0);
  });

  it("cambia el rol del usuario", async () => {
    mockDb.enqueue([]);

    const result = await updateUserRole({ userId: "u2", role: "admin" });

    expect(result).toEqual({ ok: true });
    const values = callsOf("set")[0].args[0] as Record<string, unknown>;
    expect(values).toMatchObject({ role: "admin" });
    expect(callsOf("where")).toHaveLength(1);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/personas");
  });
});

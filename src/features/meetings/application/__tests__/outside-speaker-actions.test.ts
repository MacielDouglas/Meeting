import { mockDb, rejected } from "@test/mock-db";
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requirePrivilegedUser } from "@/features/auth/application/session";
import type { AuthUser } from "@/features/auth/domain/user";
import {
  createOutsideSpeaker,
  deleteOutsideSpeaker,
  updateOutsideSpeaker,
} from "@/features/meetings/application/outside-speaker-actions";

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
  revalidateTag: vi.fn(),
}));

const user: AuthUser = { id: "user-1", email: "a@b.c", name: "Prueba", image: null, role: "admin" };

const validSpeaker = {
  name: "  Carlos Ruiz  ",
  congregation: "Centro",
  phone: "555",
  notes: "n",
  talks: [
    { talkNumber: 10, talkTheme: "Primer discurso" },
    { talkNumber: 20, talkTheme: " Segundo  " },
  ],
};

function rejection(message: string): unknown {
  return rejected(new Error(message));
}

function valuePayloads(): Record<string, unknown>[] {
  return mockDb.calls
    .filter((call) => call.fn === "values")
    .map((call) => call.args[0] as Record<string, unknown>);
}

beforeEach(() => {
  mockDb.reset();
  vi.clearAllMocks();
  vi.mocked(requirePrivilegedUser).mockResolvedValue(user);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createOutsideSpeaker", () => {
  it("rechaza entradas inválidas", async () => {
    await expect(createOutsideSpeaker({ name: "   " })).resolves.toEqual({
      ok: false,
      error: "Datos del orador inválidos.",
    });
    await expect(createOutsideSpeaker(undefined)).resolves.toEqual({
      ok: false,
      error: "Datos del orador inválidos.",
    });
    expect(requirePrivilegedUser).toHaveBeenCalledTimes(2);
    expect(mockDb.calls).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("propaga el error de autenticación", async () => {
    vi.mocked(requirePrivilegedUser).mockRejectedValue(new Error("FORBIDDEN"));
    await expect(createOutsideSpeaker(validSpeaker)).rejects.toThrow("FORBIDDEN");
  });

  it("crea el orador, espeja el primer discurso y guarda la lista", async () => {
    mockDb.enqueueMany([[], [], [], [], []]);
    await expect(createOutsideSpeaker(validSpeaker)).resolves.toEqual({ ok: true });
    expect(valuePayloads()[0]).toMatchObject({
      id: expect.any(String),
      name: "Carlos Ruiz",
      congregation: "Centro",
      phone: "555",
      notes: "n",
      talkNumber: 10,
      talkTheme: "Primer discurso",
    });
    expect(valuePayloads().slice(1)).toEqual([
      expect.objectContaining({ talkNumber: 10, talkTheme: "Primer discurso" }),
      expect.objectContaining({ talkNumber: 20, talkTheme: "Segundo" }),
    ]);
    expect(mockDb.calls.filter((call) => call.fn === "delete")).toHaveLength(1);
    expect(revalidatePath).toHaveBeenCalledWith("/reunioes");
    expect(mockDb.pending).toBe(0);
  });

  it("crea sin discursos con la columna legada nula", async () => {
    mockDb.enqueueMany([[], [], []]);
    await expect(createOutsideSpeaker({ name: "Ana Solís", talks: [] })).resolves.toEqual({
      ok: true,
    });
    expect(valuePayloads()[0]).toMatchObject({ talkNumber: null, talkTheme: "" });
    expect(valuePayloads()).toHaveLength(1);
    expect(mockDb.pending).toBe(0);
  });

  it("propaga errores de la base", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(createOutsideSpeaker(validSpeaker)).rejects.toThrow("fallo transitorio");
  });
});

describe("updateOutsideSpeaker", () => {
  it("rechaza id inválido", async () => {
    await expect(updateOutsideSpeaker("", validSpeaker)).resolves.toEqual({
      ok: false,
      error: "Orador no válido.",
    });
    expect(mockDb.calls).toEqual([]);
  });

  it("rechaza datos inválidos", async () => {
    await expect(
      updateOutsideSpeaker("s1", { name: "Ana", talks: [{ talkNumber: 0 }] }),
    ).resolves.toEqual({ ok: false, error: "Datos del orador inválidos." });
    expect(mockDb.calls).toEqual([]);
  });

  it("actualiza el orador y reemplaza sus discursos", async () => {
    mockDb.enqueueMany([[], [], [], []]);
    await expect(updateOutsideSpeaker("s1", { ...validSpeaker, talkNumber: 99 })).resolves.toEqual({
      ok: true,
    });
    const updateSet = mockDb.calls.find((call) => call.fn === "set")?.args[0] as Record<
      string,
      unknown
    >;
    expect(updateSet).toMatchObject({
      name: "Carlos Ruiz",
      talkNumber: 10,
      talkTheme: "Primer discurso",
    });
    expect(updateSet.updatedAt).toBeInstanceOf(Date);
    expect(valuePayloads()).toEqual([
      expect.objectContaining({ talkNumber: 10 }),
      expect.objectContaining({ talkNumber: 20 }),
    ]);
    expect(mockDb.calls.filter((call) => call.fn === "delete")).toHaveLength(1);
    expect(revalidatePath).toHaveBeenCalledWith("/reunioes");
    expect(mockDb.pending).toBe(0);
  });
});

describe("deleteOutsideSpeaker", () => {
  it("rechaza id inválido", async () => {
    await expect(deleteOutsideSpeaker("")).resolves.toEqual({
      ok: false,
      error: "Orador no válido.",
    });
    expect(mockDb.calls).toEqual([]);
  });

  it("borra los discursos y luego el orador", async () => {
    mockDb.enqueueMany([[], [], []]);
    await expect(deleteOutsideSpeaker("s1")).resolves.toEqual({ ok: true });
    expect(mockDb.calls.map((call) => call.fn)).toEqual([
      "execute",
      "delete",
      "where",
      "delete",
      "where",
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/reunioes");
    expect(mockDb.pending).toBe(0);
  });

  it("propaga errores de la base", async () => {
    mockDb.enqueue(rejection("fallo transitorio"));
    await expect(deleteOutsideSpeaker("s1")).rejects.toThrow("fallo transitorio");
  });
});

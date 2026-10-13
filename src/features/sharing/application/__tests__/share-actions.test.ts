import { mockDb } from "@test/mock-db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireOwnerUser } from "@/features/auth/application/session";
import {
  createPublicShareToken,
  revokePublicShareToken,
} from "@/features/sharing/application/share-actions";
import { getPublicShareStatus } from "@/features/sharing/application/share-queries";

vi.mock("@/features/auth/application/session", () => ({
  requireOwnerUser: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  requirePrivilegedUser: vi.fn(),
}));
vi.mock("@/shared/lib/db", async () => {
  const { mockDb } = await import("@test/mock-db");
  return { getDb: () => mockDb.database };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const owner = {
  id: "owner-1",
  email: "owner@example.com",
  name: "Owner",
  image: null,
  role: "owner" as const,
};

beforeEach(() => {
  mockDb.reset();
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("share-actions (owner)", () => {
  it("recusa criar enlace para não-owner sem tocar o banco", async () => {
    vi.mocked(requireOwnerUser).mockRejectedValue(new Error("FORBIDDEN"));
    const result = await createPublicShareToken();
    expect(result).toEqual({ ok: false, error: "Solo el owner puede generar el enlace." });
    expect(mockDb.calls).toHaveLength(0);
  });

  it("recusa revogar enlace para não-owner", async () => {
    vi.mocked(requireOwnerUser).mockRejectedValue(new Error("FORBIDDEN"));
    const result = await revokePublicShareToken();
    expect(result).toEqual({ ok: false, error: "Solo el owner puede revocar el enlace." });
  });

  it("cria token de 32 chars com URL e nunca persiste o claro", async () => {
    vi.mocked(requireOwnerUser).mockResolvedValue(owner);
    // ensureShareOrganization → org; delete anterior; insert novo.
    mockDb.enqueue([{ id: "org-1" }]);
    mockDb.enqueue([]);
    mockDb.enqueue([]);
    const result = await createPublicShareToken();
    expect(result.ok).toBe(true);
    expect(result.token).toMatch(/^[A-Za-z0-9]{32}$/);
    expect(result.url).toContain(`/api/public/programa/${result.token}`);
    // Validade de 90 dias retornada na criação.
    expect(result.expiresAt).toBeDefined();
    const ttl = new Date(result.expiresAt ?? 0).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(89 * 24 * 60 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(90 * 24 * 60 * 60 * 1000);
  });

  it("revoga o enlace do owner", async () => {
    vi.mocked(requireOwnerUser).mockResolvedValue(owner);
    mockDb.enqueue([{ id: "org-1" }]);
    mockDb.enqueue([]);
    const result = await revokePublicShareToken();
    expect(result).toEqual({ ok: true });
  });

  it("orienta a migrar quando a tabela public_share não existe (criar)", async () => {
    vi.mocked(requireOwnerUser).mockResolvedValue(owner);
    mockDb.enqueue([{ id: "org-1" }]);
    mockDb.enqueueRejection(new Error('relation "public_share" does not exist'));
    const result = await createPublicShareToken();
    expect(result).toEqual({
      ok: false,
      error:
        "Tabla de enlaces no creada en la base de datos. Ejecuta `npm run db:push` y recarga la página.",
    });
  });

  it("orienta a migrar quando a tabela public_share não existe (revogar)", async () => {
    vi.mocked(requireOwnerUser).mockResolvedValue(owner);
    mockDb.enqueue([{ id: "org-1" }]);
    mockDb.enqueueRejection(new Error('relation "public_share" does not exist'));
    const result = await revokePublicShareToken();
    expect(result).toEqual({
      ok: false,
      error:
        "Tabla de enlaces no creada en la base de datos. Ejecuta `npm run db:push` y recarga la página.",
    });
  });

  it("orienta a migrar pelo código SQLSTATE do Neon (42P01) em vez de 500", async () => {
    vi.mocked(requireOwnerUser).mockResolvedValue(owner);
    mockDb.enqueue([{ id: "org-1" }]);
    mockDb.enqueueRejection(
      Object.assign(new Error('relation "public_share" does not exist'), { code: "42P01" }),
    );
    const result = await createPublicShareToken();
    expect(result).toEqual({
      ok: false,
      error:
        "Tabla de enlaces no creada en la base de datos. Ejecuta `npm run db:push` y recarga la página.",
    });
  });

  it("retenta com outro token em colisão unique detectada pelo código 23505", async () => {
    vi.mocked(requireOwnerUser).mockResolvedValue(owner);
    mockDb.enqueue([{ id: "org-1" }]);
    mockDb.enqueue([]); // delete anterior
    mockDb.enqueueRejection(
      Object.assign(
        new Error(
          'duplicate key value violates unique constraint "public_share_token_hash_unique"',
        ),
        { code: "23505" },
      ),
    );
    mockDb.enqueue([]); // delete (retentativa)
    mockDb.enqueue([]); // insert (retentativa)
    const result = await createPublicShareToken();
    expect(result.ok).toBe(true);
    expect(result.token).toMatch(/^[A-Za-z0-9]{32}$/);
  });

  it("nunca estoura 500 ao criar: falha inesperada vira erro amigável", async () => {
    vi.mocked(requireOwnerUser).mockResolvedValue(owner);
    mockDb.enqueue([{ id: "org-1" }]);
    mockDb.enqueueRejection(new Error("Error connecting to database: fetch failed"));
    await expect(createPublicShareToken()).resolves.toEqual({
      ok: false,
      error: "No se pudo generar el enlace. Inténtalo de nuevo.",
    });
  });

  it("nunca estoura 500 ao revogar: falha inesperada vira erro amigável", async () => {
    vi.mocked(requireOwnerUser).mockResolvedValue(owner);
    mockDb.enqueue([{ id: "org-1" }]);
    mockDb.enqueueRejection(new Error("permission denied for table public_share"));
    await expect(revokePublicShareToken()).resolves.toEqual({
      ok: false,
      error: "No se pudo revocar el enlace.",
    });
  });
});

describe("getPublicShareStatus", () => {
  it("informa enlace ativo com criação e expiração", async () => {
    vi.mocked(requireOwnerUser).mockResolvedValue(owner);
    mockDb.enqueue([
      {
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
        expiresAt: new Date("2026-11-30T10:00:00.000Z"),
      },
    ]);
    await expect(getPublicShareStatus()).resolves.toEqual({
      active: true,
      createdAt: "2026-09-01T10:00:00.000Z",
      expiresAt: "2026-11-30T10:00:00.000Z",
    });
  });

  it("informa inativo sem linha e sem tabela migrada", async () => {
    vi.mocked(requireOwnerUser).mockResolvedValue(owner);
    mockDb.enqueue([]);
    await expect(getPublicShareStatus()).resolves.toEqual({
      active: false,
      createdAt: null,
      expiresAt: null,
    });

    mockDb.enqueueRejection(new Error('relation "public_share" does not exist'));
    await expect(getPublicShareStatus()).resolves.toEqual({
      active: false,
      createdAt: null,
      expiresAt: null,
    });
  });
});

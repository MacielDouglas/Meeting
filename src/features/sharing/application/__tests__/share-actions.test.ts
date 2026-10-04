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
  });

  it("revoga o enlace do owner", async () => {
    vi.mocked(requireOwnerUser).mockResolvedValue(owner);
    mockDb.enqueue([{ id: "org-1" }]);
    mockDb.enqueue([]);
    const result = await revokePublicShareToken();
    expect(result).toEqual({ ok: true });
  });
});

describe("getPublicShareStatus", () => {
  it("informa enlace ativo com a data de criação", async () => {
    vi.mocked(requireOwnerUser).mockResolvedValue(owner);
    mockDb.enqueue([{ createdAt: new Date("2026-09-01T10:00:00.000Z") }]);
    await expect(getPublicShareStatus()).resolves.toEqual({
      active: true,
      createdAt: "2026-09-01T10:00:00.000Z",
    });
  });

  it("informa inativo sem linha e sem tabela migrada", async () => {
    vi.mocked(requireOwnerUser).mockResolvedValue(owner);
    mockDb.enqueue([]);
    await expect(getPublicShareStatus()).resolves.toEqual({ active: false, createdAt: null });

    mockDb.enqueueRejection(new Error('relation "public_share" does not exist'));
    await expect(getPublicShareStatus()).resolves.toEqual({ active: false, createdAt: null });
  });
});

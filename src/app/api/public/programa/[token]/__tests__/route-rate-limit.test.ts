import { mockDb } from "@test/mock-db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/public/programa/[token]/route";
import { SHARE_RATE_MAX_REQUESTS } from "@/features/sharing/application/share-rate-limit";

vi.mock("@/shared/lib/db", async () => {
  const { mockDb } = await import("@test/mock-db");
  return { getDb: () => mockDb.database };
});

beforeEach(() => {
  mockDb.reset();
  vi.resetAllMocks();
});

describe("GET /api/public/programa/[token] — rate limit", () => {
  it("responde 429 após 60 req/min (sem tocar o banco nos inválidos)", async () => {
    for (let i = 0; i < SHARE_RATE_MAX_REQUESTS; i++) {
      const response = await GET(
        new Request("http://localhost:3000/api/public/programa/curto"),
        { params: Promise.resolve({ token: "curto" }) },
      );
      expect(response.status).toBe(404);
    }
    const limited = await GET(new Request("http://localhost:3000/api/public/programa/curto"), {
      params: Promise.resolve({ token: "curto" }),
    });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("60");
    expect(await limited.json()).toEqual({ error: "Too many requests." });
    expect(mockDb.calls).toHaveLength(0);
  });
});

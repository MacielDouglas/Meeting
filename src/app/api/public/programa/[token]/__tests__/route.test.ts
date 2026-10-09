import { mockDb } from "@test/mock-db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/public/programa/[token]/route";
import { decryptSharePayload } from "@/features/sharing/domain/share-crypto";

vi.mock("@/shared/lib/db", async () => {
  const { mockDb } = await import("@test/mock-db");
  return { getDb: () => mockDb.database };
});

const TOKEN = "AbC123XyZ456DeF789GhI012JkL345Mn";

function get(token: string): Promise<Response> {
  return GET(new Request(`http://localhost:3000/api/public/programa/${token}`), {
    params: Promise.resolve({ token }),
  });
}

function programRow(kind: "midweek" | "weekend", weekStart: string) {
  return {
    id: `prog-${kind}`,
    kind,
    weekStart,
    date: kind === "midweek" ? "2026-09-30" : "2026-10-04",
    outlineId: null,
    createdBy: null,
    status: "confirmed",
    exceptionType: "",
    exceptionLabel: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function assignmentRow(programId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "asg-1",
    programId,
    partKey: "bible-reading",
    section: "Sección",
    title: "Lectura de la Biblia",
    subtitle: "",
    startTime: "19:30",
    durationMinutes: 10,
    personId: "person-1",
    personName: "Ana Torres",
    helperPersonId: null,
    helperPersonName: "",
    songNumber: null,
    songTheme: "",
    classroom: "A",
    study: "",
    source: "",
    notes: "",
    speakerCongregation: "",
    sortOrder: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

function givenFullWeek(): void {
  // Ordem de consultas da rota: enlace → ajustes → midweek → weekend →
  // atribuições midweek → atribuições weekend → apoio.
  mockDb.enqueue([{ organizationId: "org-1" }]);
  mockDb.enqueue([{ congregationName: "Congregación Este" }]);
  mockDb.enqueue([programRow("midweek", "2026-09-28")]);
  mockDb.enqueue([programRow("weekend", "2026-09-28")]);
  mockDb.enqueue([assignmentRow("prog-midweek")]);
  mockDb.enqueue([
    assignmentRow("prog-weekend", {
      id: "asg-2",
      partKey: "public-talk",
      title: "Discurso público",
      startTime: "10:00",
      personName: "Juan Pérez",
    }),
  ]);
  mockDb.enqueue([
    {
      date: "2026-09-30",
      meetingKind: "midweek",
      dutyKey: "sound",
      postLabel: "Sonido",
      personName: "Luis Gómez",
    },
  ]);
}

beforeEach(() => {
  mockDb.reset();
  vi.resetAllMocks();
});

describe("GET /api/public/programa/[token]", () => {
  it("responde 404 quando o formato do token é inválido (inclui o legado de 12)", async () => {
    for (const bad of ["curto", "AbC123XyZ456", `${TOKEN}X`, `${TOKEN.slice(0, -1)}!`]) {
      const response = await get(bad);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Not found." });
    }
    expect(mockDb.calls).toHaveLength(0);
  });

  it("responde 404 quando o token não existe (revogado)", async () => {
    mockDb.enqueue([]);
    const response = await get(TOKEN);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found." });
  });

  it("responde 404 quando o token expirou (mesmo 404 de desconhecido)", async () => {
    mockDb.enqueue([{ organizationId: "org-1", expiresAt: new Date(Date.now() - 1000) }]);
    const response = await get(TOKEN);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found." });
  });

  it("responde 200 com envelope cifrado que só o token abre", async () => {
    givenFullWeek();
    const response = await get(TOKEN);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, must-revalidate");

    const envelope = await response.json();
    expect(envelope.v).toBe(1);
    expect(envelope.alg).toBe("aes-256-gcm");

    const payload = JSON.parse(decryptSharePayload(TOKEN, envelope));
    expect(payload.congregationName).toBe("Congregación Este");
    expect(payload.midweek.assignments[0].personName).toBe("Ana Torres");
    expect(payload.weekend.assignments[0].title).toBe("Discurso público");
    expect(payload.duties[0]).toMatchObject({ dutyKey: "sound", personName: "Luis Gómez" });
    // Ids internos não vazam no enlace público.
    expect(JSON.stringify(payload)).not.toContain("person-1");
  });

  it("o corpo cifrado é opaco sem o token", async () => {
    givenFullWeek();
    const response = await get(TOKEN);
    const raw = await response.text();
    expect(raw).not.toContain("Ana Torres");
    expect(raw).not.toContain("Congregación");
  });

  it("responde 500 quando o banco falha", async () => {
    mockDb.enqueueRejection(new Error("boom"));
    const response = await get(TOKEN);
    expect(response.status).toBe(500);
  });
});

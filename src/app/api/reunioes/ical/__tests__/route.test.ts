import { mockDb } from "@test/mock-db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/reunioes/ical/route";
import { getCurrentUser, requireAuthenticatedUser } from "@/features/auth/application/session";
import type {
  MeetingAssignmentItem,
  MeetingProgramItem,
} from "@/features/meetings/application/meeting-queries";

vi.mock("@/features/auth/application/session", () => ({
  getCurrentUser: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  requirePrivilegedUser: vi.fn(),
}));
vi.mock("@/shared/lib/db", async () => {
  const { mockDb } = await import("@test/mock-db");
  return { getDb: () => mockDb.database };
});

const owner = {
  id: "u1",
  email: "owner@example.com",
  name: "Ola Owner",
  image: null,
  role: "owner" as const,
};
const member = { ...owner, role: "member" as const };

const programRow: MeetingProgramItem = {
  id: "prog-2026w39",
  kind: "midweek",
  weekStart: "2026-09-21",
  date: "2026-09-23",
  outlineId: null,
  status: "confirmed",
  exceptionType: "",
  exceptionLabel: "",
  assignmentCount: 3,
};

function assignmentRow(overrides: Partial<MeetingAssignmentItem>): MeetingAssignmentItem {
  return {
    id: "asg-1",
    programId: programRow.id,
    partKey: "part",
    section: "Sección",
    title: "Parte",
    subtitle: "",
    startTime: "19:30",
    durationMinutes: 10,
    personId: null,
    personName: "",
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
    ...overrides,
  };
}

function givenProgram(): void {
  mockDb.enqueue([programRow]);
  mockDb.enqueue([
    assignmentRow({
      id: "asg-1",
      partKey: "bible-reading",
      title: "Lectura de la Biblia",
      startTime: "19:30",
      durationMinutes: 10,
      personName: "Ana Torres",
    }),
    assignmentRow({
      id: "asg-2",
      partKey: "song",
      title: "Oración de apertura",
      startTime: "19:40",
      durationMinutes: 5,
      songNumber: 1,
      personName: "Pérez, Juan",
      sortOrder: 2,
    }),
    assignmentRow({
      id: "asg-3",
      partKey: "comment",
      title: "Comentario, aplicación",
      startTime: "19:45",
      durationMinutes: 15,
      personName: "Luis Gómez",
      helperPersonName: "María Ruiz",
      sortOrder: 3,
    }),
  ]);
}

function get(path: string): Promise<Response> {
  return GET(new Request(`http://localhost:3000/api/reunioes/ical${path}`));
}

beforeEach(() => {
  mockDb.reset();
  vi.resetAllMocks();
});

describe("GET /api/reunioes/ical", () => {
  it("responde 401 sin sesión", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await get("");
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });

  it("responde 403 para member", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(member);
    const response = await get("?week=2026-09-21");
    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Forbidden");
  });

  it("responde 400 cuando week no tiene formato AAAA-MM-DD", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(owner);
    const response = await get("?week=2026-9-9");
    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Parámetro week no válido (YYYY-MM-DD).");
    expect(vi.mocked(requireAuthenticatedUser)).not.toHaveBeenCalled();
    expect(mockDb.calls).toHaveLength(0);
  });

  it("responde 404 cuando no hay programa para la semana", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(owner);
    vi.mocked(requireAuthenticatedUser).mockResolvedValue(owner);
    mockDb.enqueue([]);
    const response = await get("?kind=midweek&week=2026-09-21");
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Programa no encontrado.");
  });

  it("responde 200 con iCal del programa entre semana", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(owner);
    vi.mocked(requireAuthenticatedUser).mockResolvedValue(owner);
    givenProgram();
    const response = await get("?kind=midweek&week=2026-09-21");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/calendar; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="reuniao-midweek-2026-09-21.ics"',
    );
    expect(response.headers.get("Cache-Control")).toBe("private, max-age=60, must-revalidate");
    const body = await response.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("VERSION:2.0");
    expect(body).toContain("BEGIN:VEVENT");
    expect(body).toContain("UID:prog-2026w39@meeting");
    expect(body).toContain("DTSTART:20260923T193000");
    expect(body).toContain("DURATION:PT30M");
    expect(body).toContain("SUMMARY:Reunión entre semana");
    expect(body).toContain("19:30 Lectura de la Biblia — Ana Torres");
    expect(body).toContain("Cántico 1 y oración — Pérez\\, Juan");
    expect(body).toContain("Comentario\\, aplicación — Luis Gómez · María Ruiz");
    expect(body).toContain("Ana Torres\\n19:40 Cántico 1 y oración");
    expect(body).toContain("END:VEVENT");
    expect(body).toContain("END:VCALENDAR");
  });

  it("responde 200 con iCal de fin de semana", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(owner);
    vi.mocked(requireAuthenticatedUser).mockResolvedValue(owner);
    givenProgram();
    const response = await get("?kind=weekend&week=2026-09-21");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="reuniao-weekend-2026-09-21.ics"',
    );
    const body = await response.text();
    expect(body).toContain("SUMMARY:Reunión de fin de semana");
    expect(body).toContain("UID:prog-2026w39@meeting");
  });

  it("responde 200 con el evento cuando la semana es de asamblea", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(owner);
    vi.mocked(requireAuthenticatedUser).mockResolvedValue(owner);
    mockDb.enqueue([]);
    mockDb.enqueue([
      {
        congregationName: "",
        midweekDay: 2,
        midweekTime: "19:30",
        weekendDay: 0,
        weekendTime: "10:00",
      },
    ]);
    mockDb.enqueue([
      {
        id: "evt-1",
        type: "regional_assembly",
        title: "Asamblea Regional",
        startDate: "2026-09-26",
        endDate: "2026-09-28",
        startTime: "09:00",
        notes: "Llevar almuerzo",
        speakerName: null,
        midweekTheme: null,
        publicTalkTheme: null,
        finalTalkTheme: null,
      },
    ]);
    const response = await get("?kind=midweek&week=2026-09-21");
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("UID:evt-1@meeting");
    expect(body).toContain("DTSTART:20260926T090000");
    expect(body).toContain("SUMMARY:Asamblea Regional");
    expect(body).toContain("Llevar almuerzo");
  });
});

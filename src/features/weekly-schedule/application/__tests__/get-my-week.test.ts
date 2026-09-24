import { beforeEach, describe, expect, it, vi } from "vitest";
import { listPersonCleaningInRange } from "@/features/cleaning/application/cleaning-program-queries";
import {
  listPersonDutiesInRange,
  listUpcomingPersonDuties,
} from "@/features/meeting-duties/application/duty-queries";
import {
  getMeetingProgram,
  type MeetingAssignmentItem,
  type MeetingProgramItem,
} from "@/features/meetings/application/meeting-queries";
import { getPersonByUserId } from "@/features/people/application/queries";
import { getMyWeek } from "@/features/weekly-schedule/application/get-my-week";
import { getWeeklySchedule } from "@/features/weekly-schedule/application/get-weekly-schedule";
import type { WeeklySchedule } from "@/features/weekly-schedule/domain/schedule";

vi.mock("@/features/people/application/queries", () => ({ getPersonByUserId: vi.fn() }));
vi.mock("@/features/weekly-schedule/application/get-weekly-schedule", () => ({
  getWeeklySchedule: vi.fn(),
}));
vi.mock("@/features/meetings/application/meeting-queries", () => ({
  getMeetingProgram: vi.fn(),
}));
vi.mock("@/features/cleaning/application/cleaning-program-queries", () => ({
  listPersonCleaningInRange: vi.fn(),
}));
vi.mock("@/features/meeting-duties/application/duty-queries", () => ({
  listPersonDutiesInRange: vi.fn(),
  listUpcomingPersonDuties: vi.fn(),
}));

const reference = new Date(2026, 8, 21, 12);

const schedule: WeeklySchedule = {
  weekStart: "2026-09-21",
  weekEnd: "2026-09-27",
  midweek: {
    id: "midweek-2026-09-21",
    kind: "midweek",
    date: "2026-09-23",
    time: "20:00",
    location: "Salón del Reino",
    theme: "Reunión entre semana",
    parts: [],
  },
  weekend: {
    id: "weekend-2026-09-27",
    kind: "weekend",
    date: "2026-09-27",
    time: "10:00",
    location: "Salón del Reino",
    theme: "Reunión de fin de semana",
    parts: [],
  },
};

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
    startTime: "20:00",
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

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getMyWeek", () => {
  it("devuelve solo las reuniones cuando no hay persona vinculada", async () => {
    vi.mocked(getPersonByUserId).mockResolvedValue(null);
    vi.mocked(getWeeklySchedule).mockResolvedValue(schedule);
    const result = await getMyWeek("user-1", reference);
    expect(result).toEqual({
      weekStart: "2026-09-21",
      weekEnd: "2026-09-27",
      personName: null,
      isMale: false,
      meetings: [
        {
          kind: "midweek",
          title: "Reunión entre semana",
          date: "2026-09-23",
          time: "20:00",
          location: "Salón del Reino",
          isNext: true,
          parts: [],
          cleaning: [],
          duties: [],
        },
        {
          kind: "weekend",
          title: "Reunión de fin de semana",
          date: "2026-09-27",
          time: "10:00",
          location: "Salón del Reino",
          isNext: false,
          parts: [],
          cleaning: [],
          duties: [],
        },
      ],
      upcomingDuties: [],
    });
    expect(vi.mocked(getPersonByUserId)).toHaveBeenCalledWith("user-1");
    expect(vi.mocked(getMeetingProgram)).not.toHaveBeenCalled();
  });

  it("monta partes, limpieza, apoyos y próximos apoyos del hombre vinculado", async () => {
    vi.mocked(getPersonByUserId).mockResolvedValue({
      id: "p1",
      firstName: "Juan",
      lastName: "Pérez",
      sex: "male",
    });
    vi.mocked(getWeeklySchedule).mockResolvedValue(schedule);
    vi.mocked(getMeetingProgram).mockImplementation(async (kind) =>
      kind === "midweek"
        ? {
            program: programRow,
            assignments: [
              assignmentRow({
                id: "asg-1",
                partKey: "bible-reading",
                section: "Estudio de la Biblia",
                title: "Lectura de la Biblia",
                durationMinutes: 10,
                personId: "p1",
                personName: "Juan Pérez",
              }),
              assignmentRow({
                id: "asg-2",
                partKey: "talk",
                section: "Aplicación",
                title: "Discurso",
                durationMinutes: 15,
                personId: "p9",
                personName: "Pedro Ruiz",
                helperPersonId: "p1",
                helperPersonName: "Juan Pérez",
                sortOrder: 2,
              }),
              assignmentRow({
                id: "asg-3",
                partKey: "other",
                title: "Otra parte",
                personId: "p9",
                personName: "Pedro Ruiz",
                sortOrder: 3,
              }),
            ],
          }
        : null,
    );
    vi.mocked(listPersonCleaningInRange).mockResolvedValue([
      { assignmentDate: "2026-09-23", sectorKey: "salon", sectorName: "Salón", isFamily: false },
      { assignmentDate: "2026-09-27", sectorKey: "terraza", sectorName: "Terraza", isFamily: true },
      { assignmentDate: "2026-09-30", sectorKey: "fuera", sectorName: "Fuera", isFamily: false },
    ]);
    vi.mocked(listPersonDutiesInRange).mockResolvedValue([
      {
        assignmentDate: "2026-09-23",
        dutyKey: "sound",
        postLabel: "Sonido",
        side: null,
        sortOrder: 1,
      },
    ]);
    vi.mocked(listUpcomingPersonDuties).mockResolvedValue([
      {
        assignmentDate: "2026-09-23",
        dutyKey: "sound",
        postLabel: "Sonido",
        side: null,
        sortOrder: 1,
      },
      {
        assignmentDate: "2026-10-01",
        dutyKey: "usher",
        postLabel: "Recibimiento",
        side: "izquierda",
        sortOrder: 2,
      },
    ]);

    const result = await getMyWeek("user-1", reference);

    expect(result.personName).toBe("Juan Pérez");
    expect(result.isMale).toBe(true);
    expect(result.meetings[0].kind).toBe("midweek");
    expect(result.meetings[0].isNext).toBe(true);
    expect(result.meetings[1].isNext).toBe(false);
    expect(result.meetings[0].parts).toEqual([
      {
        partKey: "bible-reading",
        section: "Estudio de la Biblia",
        title: "Lectura de la Biblia",
        durationMinutes: 10,
        songNumber: null,
        isHelper: false,
        personName: "Juan Pérez",
        helperPersonName: "",
      },
      {
        partKey: "talk",
        section: "Aplicación",
        title: "Discurso",
        durationMinutes: 15,
        songNumber: null,
        isHelper: true,
        personName: "Pedro Ruiz",
        helperPersonName: "Juan Pérez",
      },
    ]);
    expect(result.meetings[1].parts).toEqual([]);
    expect(result.meetings[0].cleaning).toEqual([
      { assignmentDate: "2026-09-23", sectorKey: "salon", sectorName: "Salón", isFamily: false },
    ]);
    expect(result.meetings[1].cleaning).toEqual([
      { assignmentDate: "2026-09-27", sectorKey: "terraza", sectorName: "Terraza", isFamily: true },
    ]);
    expect(result.meetings[0].duties).toEqual([
      {
        assignmentDate: "2026-09-23",
        dutyKey: "sound",
        postLabel: "Sonido",
        side: null,
        sortOrder: 1,
      },
    ]);
    expect(result.upcomingDuties).toEqual([
      {
        assignmentDate: "2026-10-01",
        dutyKey: "usher",
        postLabel: "Recibimiento",
        side: "izquierda",
        sortOrder: 2,
      },
    ]);
    expect(vi.mocked(getMeetingProgram)).toHaveBeenNthCalledWith(1, "midweek", "2026-09-21");
    expect(vi.mocked(getMeetingProgram)).toHaveBeenNthCalledWith(2, "weekend", "2026-09-21");
    expect(vi.mocked(listPersonCleaningInRange)).toHaveBeenCalledWith(
      "p1",
      "2026-09-21",
      "2026-09-27",
    );
  });

  it("no consulta apoyos en la reunión para mujeres", async () => {
    vi.mocked(getPersonByUserId).mockResolvedValue({
      id: "p2",
      firstName: "María",
      lastName: " Ruiz",
      sex: "female",
    });
    vi.mocked(getWeeklySchedule).mockResolvedValue(schedule);
    vi.mocked(getMeetingProgram).mockResolvedValue(null);
    vi.mocked(listPersonCleaningInRange).mockResolvedValue([]);

    const result = await getMyWeek("user-2", reference);

    expect(result.personName).toBe("María  Ruiz".trim());
    expect(result.isMale).toBe(false);
    expect(result.meetings[0].parts).toEqual([]);
    expect(vi.mocked(listPersonDutiesInRange)).not.toHaveBeenCalled();
    expect(vi.mocked(listUpcomingPersonDuties)).not.toHaveBeenCalled();
  });

  it("muestra la reunión de fin de semana primero cuando la entre semana ya pasó", async () => {
    vi.mocked(getPersonByUserId).mockResolvedValue({
      id: "p2",
      firstName: "María",
      lastName: "Ruiz",
      sex: "female",
    });
    vi.mocked(getWeeklySchedule).mockResolvedValue(schedule);
    vi.mocked(getMeetingProgram).mockResolvedValue(null);
    vi.mocked(listPersonCleaningInRange).mockResolvedValue([]);

    const friday = new Date(2026, 8, 25, 12);
    const result = await getMyWeek("user-2", friday);

    expect(result.meetings[0].kind).toBe("weekend");
    expect(result.meetings[0].isNext).toBe(true);
    expect(result.meetings[1].kind).toBe("midweek");
    expect(result.meetings[1].isNext).toBe(false);
  });
});

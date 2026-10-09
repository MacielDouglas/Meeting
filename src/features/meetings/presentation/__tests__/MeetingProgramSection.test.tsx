// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMeetingProgram } from "@/features/meetings/application/meeting-queries";
import { MeetingProgramSection } from "@/features/meetings/presentation/MeetingProgramSection";
import { es } from "@/shared/i18n/es";

vi.mock("@/features/meetings/application/meeting-queries", () => ({
  getMeetingProgram: vi.fn(),
  listProgramDates: vi.fn(),
  listProgramsForPdf: vi.fn(),
}));
vi.mock("@/features/meetings/application/meeting-actions", () => ({
  saveMeetingProgram: vi.fn(),
  saveStagedChanges: vi.fn(),
  updateMeetingAssignment: vi.fn(),
  updateMeetingAssignmentDetails: vi.fn(),
  updateMeetingException: vi.fn(),
  updateMeetingSong: vi.fn(),
}));

const defaultProps: ComponentProps<typeof MeetingProgramSection> = {
  songs: [{ number: 1, theme: "Cielos declaran la gloria de Dios" }],
  outlines: [],
  workbooks: [{ label: "Apostila septiembre 2026", meeting: {}, weekStart: "2026-09-21" }],
  articles: [],
  midweekTime: "19:30",
  weekendTime: "10:00",
  midweekDay: 3,
  weekendDay: 0,
  canManage: true,
  initialWeekStart: "2026-09-21",
  initialKind: "midweek",
  congregationName: "",
  events: [],
};

const programFixture = {
  program: {
    id: "prog-1",
    kind: "midweek" as const,
    weekStart: "2026-09-21",
    date: "2026-09-24",
    outlineId: null,
    status: "draft" as const,
    exceptionType: "",
    exceptionLabel: "",
    assignmentCount: 0,
  },
  assignments: [],
};

function renderSection(overrides: Partial<ComponentProps<typeof MeetingProgramSection>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const props = { ...defaultProps, ...overrides };
  return render(
    <QueryClientProvider client={queryClient}>
      <MeetingProgramSection {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.setItem("reunioes-edit-mode", "1");
  vi.mocked(getMeetingProgram).mockResolvedValue(programFixture);
});

describe("MeetingProgramSection", () => {
  it("muestra CardSkeleton durante la carga y luego el título de la reunión", async () => {
    renderSection();

    expect(screen.getByText(/21 - 27 septiembre/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reunión de entre semana/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    expect(await screen.findByText(/Reunión de entre semana/)).toBeInTheDocument();
  });

  it("sin programa guardado ofrece crear el programa de la semana", async () => {
    vi.mocked(getMeetingProgram).mockResolvedValue(null);
    renderSection();

    expect(await screen.findByText(es.programaNoEncontrado)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.crearProgramaSemana })).toBeInTheDocument();
    expect(screen.queryByText("Presidente")).not.toBeInTheDocument();
  });

  it("exibe o número da apostila nas partes do meio de semana", async () => {
    renderSection({
      workbooks: [
        {
          label: "Guía septiembre 2026",
          weekStart: "2026-09-21",
          meeting: {
            BibleReading: "JEREMÍAS 29,30",
            "TREASURES FROM GODS WORD": [
              { title: "Jehová disciplina a su pueblo", number: 1, duration: "(10 mins.)" },
              { title: "Busquemos perlas escondidas", number: 2, duration: "(10 mins.)" },
              { title: "Lectura de la Biblia", number: 3, duration: "(4 mins.)" },
            ],
          },
        },
      ],
    });

    expect(await screen.findByText(/1\. Jehová disciplina a su pueblo/)).toBeInTheDocument();
    expect(screen.getByText(/2\. Busquemos perlas escondidas/)).toBeInTheDocument();
    expect(screen.getByText(/3\. Lectura de la Biblia/)).toBeInTheDocument();
    // Vaga em caixa normal, à esquerda, sem uppercase.
    expect(screen.getAllByText(es.sinAsignar).length).toBeGreaterThan(0);
    expect(screen.queryByText(/SIN ASIGNAR/)).not.toBeInTheDocument();
  });

  it("en semana de asamblea muestra el aviso en lugar de programar", async () => {
    renderSection({
      events: [
        {
          id: "evt-1",
          type: "regional_assembly",
          title: "Asamblea Regional",
          startDate: "2026-09-26",
          endDate: "2026-09-28",
          startTime: "09:00",
          notes: null,
          speakerName: null,
          midweekTheme: null,
          publicTalkTheme: null,
          finalTalkTheme: null,
        },
      ],
    });

    expect(await screen.findByRole("heading", { name: "Asamblea Regional" })).toBeInTheDocument();
    expect(screen.getByText(es.assemblyCta)).toBeInTheDocument();
    expect(screen.getByText(es.eventReplacesMeeting)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: es.crearProgramaSemana })).not.toBeInTheDocument();
  });

  it("sin modo edición no ofrece crear el programa (solo lectura)", async () => {
    window.localStorage.setItem("reunioes-edit-mode", "0");
    vi.mocked(getMeetingProgram).mockResolvedValue(null);
    renderSection();

    expect(await screen.findByText(es.programaNoEncontrado)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: es.crearProgramaSemana })).not.toBeInTheDocument();
    expect(screen.queryByText(es.activaModoEdicion)).not.toBeInTheDocument();
  });

  it("sin permiso de gestión muestra solo lectura aunque el modo edición esté activo", async () => {
    vi.mocked(getMeetingProgram).mockResolvedValue(null);
    renderSection({ canManage: false });

    expect(await screen.findByText(es.programaNoEncontrado)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: es.crearProgramaSemana })).not.toBeInTheDocument();
    expect(screen.queryByText(es.soloLectura)).not.toBeInTheDocument();
    expect(screen.queryByText(es.activaModoEdicion)).not.toBeInTheDocument();
  });
});

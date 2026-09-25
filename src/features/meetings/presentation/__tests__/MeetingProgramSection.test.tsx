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
    const { container } = renderSection();

    expect(container.querySelector("div.bg-card[aria-hidden]")).not.toBeNull();
    expect(screen.getByText(/21 – 27 sep/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.entreSemana })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    expect(await screen.findByText(/Reunión de entre semana/)).toBeInTheDocument();
    expect(container.querySelector("div.bg-card[aria-hidden]")).toBeNull();
  });

  it("sin programa guardado ofrece crear el programa de la semana", async () => {
    vi.mocked(getMeetingProgram).mockResolvedValue(null);
    renderSection();

    expect(await screen.findByText(es.programaNoEncontrado)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.crearProgramaSemana })).toBeInTheDocument();
    expect(screen.queryByText(/Reunión de entre semana/)).not.toBeInTheDocument();
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
    expect(screen.getByText(es.soloLectura)).toBeInTheDocument();
  });
});

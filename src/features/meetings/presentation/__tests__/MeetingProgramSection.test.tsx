// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveStagedChanges } from "@/features/meetings/application/meeting-actions";
import {
  listMeetingPersons,
  type MeetingPerson,
} from "@/features/meetings/application/meeting-person-queries";
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
vi.mock("@/features/meetings/application/meeting-person-queries", () => ({
  listMeetingPersons: vi.fn(),
}));

const meetingPerson: MeetingPerson = {
  id: "p1",
  firstName: "Juan",
  lastName: "Pérez",
  sex: "male",
  helper: true,
  unavailable: false,
  lastAssignmentAt: null,
  familyHead: false,
  familyMemberId: null,
  familyGroupId: null,
};

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

const presidentAssignment = {
  id: "asg-pres",
  programId: "prog-1",
  partKey: "president",
  section: "",
  title: "Presidente",
  subtitle: "",
  startTime: "19:00",
  durationMinutes: 0,
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
  sortOrder: 0,
};

function renderSection(overrides: Partial<ComponentProps<typeof MeetingProgramSection>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const props = { ...defaultProps, ...overrides };
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MeetingProgramSection {...props} />
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
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

  it("invalida o rodízio de pessoas após salvar designações", async () => {
    const user = userEvent.setup();
    vi.mocked(listMeetingPersons).mockResolvedValue([meetingPerson]);
    vi.mocked(saveStagedChanges).mockResolvedValue({ ok: true });
    // Parte salva com id real (ids tpl-* não abrem o modal).
    vi.mocked(getMeetingProgram).mockResolvedValue({
      program: programFixture.program,
      assignments: [presidentAssignment],
    });
    const { queryClient } = renderSection();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    // Designa o presidente no modal e encena.
    await user.click(await screen.findByRole("button", { name: "Asignar Presidente" }));
    await user.click(await screen.findByRole("button", { name: /Juan Pérez/ }));
    await user.click(screen.getByRole("button", { name: es.asignar }));
    // Salva o lote: a lista do rodízio deve recarregar fresca ao reabrir.
    await user.click(await screen.findByRole("button", { name: "Guardar cambios (1)" }));
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["meeting-persons"] }),
    );
    invalidateSpy.mockRestore();
  });

  it("aplica o rascunho vivo do storage ao voltar de data (sem snapshot)", async () => {
    window.sessionStorage.clear();
    vi.mocked(getMeetingProgram).mockResolvedValue({
      program: programFixture.program,
      assignments: [presidentAssignment],
    });
    renderSection();
    expect(await screen.findByText(/21 - 27 septiembre/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Guardar cambios/ })).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Semana siguiente/ }));
    // Semana seguinte é calculada a partir de hoje (não da fixture): espera
    // a busca da outra semana em vez de um título fixo.
    await waitFor(() => {
      const weeks = vi.mocked(getMeetingProgram).mock.calls.map((call) => call[1]);
      expect(weeks.some((week) => week !== "2026-09-21")).toBe(true);
    });
    // Rascunho surge enquanto fora da semana: ao voltar, vale o storage ao
    // vivo — nunca um snapshot guardado no cache da query (era ele que
    // ressuscitava a sujeira já salva e pedia um segundo Salvar fantasma).
    window.sessionStorage.setItem(
      "reunion-draft:midweek:2026-09-21",
      JSON.stringify({
        pending: { "asg-pres": { personId: "p1", personName: "Juan Pérez" } },
        outlineId: null,
      }),
    );
    await user.click(screen.getByRole("button", { name: /Semana anterior/ }));
    expect(await screen.findByRole("button", { name: "Guardar cambios (1)" })).toBeInTheDocument();
    window.sessionStorage.clear();
  });

  it("restaura rascunho não salvo do storage ao carregar a semana", async () => {
    window.sessionStorage.clear();
    window.sessionStorage.setItem(
      "reunion-draft:midweek:2026-09-21",
      JSON.stringify({
        pending: { "asg-pres": { personId: "p1", personName: "Juan Pérez" } },
        outlineId: null,
      }),
    );
    vi.mocked(getMeetingProgram).mockResolvedValue({
      program: programFixture.program,
      assignments: [presidentAssignment],
    });
    renderSection();
    expect(await screen.findByRole("button", { name: "Guardar cambios (1)" })).toBeInTheDocument();
    window.sessionStorage.clear();
  });
});

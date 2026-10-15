// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listMeetingPersons,
  type MeetingPerson,
} from "@/features/meetings/application/meeting-person-queries";
import { MeetingAssignModal } from "@/features/meetings/presentation/MeetingAssignModal";
import { es } from "@/shared/i18n/es";

vi.mock("@/features/meetings/application/meeting-person-queries", () => ({
  listMeetingPersons: vi.fn(),
}));

const person: MeetingPerson = {
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

function renderModal() {
  const onStage = vi.fn();
  const onClose = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MeetingAssignModal
        title="Lectura de la Biblia"
        capability="bibleReading"
        songs={[]}
        outlines={[]}
        systemCongregation=""
        startTime="19:26"
        durationMinutes={4}
        currentPersonName=""
        currentHelperName=""
        onClose={onClose}
        onStage={onStage}
        onOutlineStage={vi.fn()}
      />
    </QueryClientProvider>,
  );
  return { onStage, onClose };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listMeetingPersons).mockResolvedValue([person]);
});

describe("MeetingAssignModal nombre temporal", () => {
  it("encena o nome temporário do fim da lista e salva via Asignar", async () => {
    const user = userEvent.setup();
    const { onStage, onClose } = renderModal();

    const input = await screen.findByLabelText(es.nombreTemporal);
    await user.type(input, "Visitante Externo");
    await user.click(screen.getByRole("button", { name: es.usarNombre }));

    expect(await screen.findByText(/Temporal/)).toBeInTheDocument();
    const asignar = screen.getByRole("button", { name: es.asignar });
    expect(asignar).toBeEnabled();
    await user.click(asignar);

    expect(onStage).toHaveBeenCalledWith(
      expect.objectContaining({
        personId: null,
        personName: "Visitante Externo",
        speakerName: "Visitante Externo",
      }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("escolha da lista sobrescreve o nome temporário", async () => {
    const user = userEvent.setup();
    const { onStage } = renderModal();

    const input = await screen.findByLabelText(es.nombreTemporal);
    await user.type(input, "Visitante Externo");
    await user.click(screen.getByRole("button", { name: es.usarNombre }));
    await user.click(screen.getByRole("button", { name: /Juan Pérez/ }));
    await user.click(screen.getByRole("button", { name: es.asignar }));

    expect(onStage).toHaveBeenCalledWith(
      expect.objectContaining({ personId: "p1", personName: "Juan Pérez" }),
    );
    const staged = vi.mocked(onStage).mock.calls[0]?.[0] as { speakerName?: string };
    expect(staged?.speakerName).toBeUndefined();
  });

  it("rodapé com alvos grandes de toque", async () => {
    renderModal();
    await screen.findByLabelText(es.nombreTemporal);
    expect(screen.getByRole("button", { name: es.asignar }).className).toMatch(/min-h-\[52px\]/);
  });
});

describe("MeetingAssignModal rodízio por função", () => {
  function renderScopedModal() {
    const onStage = vi.fn();
    const onClose = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MeetingAssignModal
          title="Presidente"
          capability="weekendPresident"
          songs={[]}
          outlines={[]}
          systemCongregation=""
          startTime="09:00"
          durationMinutes={0}
          currentPersonName=""
          currentHelperName=""
          onClose={onClose}
          onStage={onStage}
          onOutlineStage={vi.fn()}
        />
      </QueryClientProvider>,
    );
    return { onStage, onClose };
  }

  it("abre o presidente do fim de semana já em rodízio da função", async () => {
    renderScopedModal();
    await screen.findByRole("button", { name: /Juan Pérez/ });
    expect(vi.mocked(listMeetingPersons)).toHaveBeenCalledWith(
      "publicChairman",
      expect.objectContaining({
        orderBy: "rotation",
        rotationScope: { partKeys: ["president"], kinds: ["weekend"] },
      }),
    );
  });

  it("etapa do leitor usa o histórico de ajudante do estudo", async () => {
    const user = userEvent.setup();
    vi.mocked(listMeetingPersons).mockResolvedValue([
      person,
      { ...person, id: "p2", firstName: "Ana", lastName: "García" },
    ]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MeetingAssignModal
          title="Estudio de La Atalaya"
          capability="watchtowerStudy"
          needsHelper
          songs={[]}
          outlines={[]}
          systemCongregation=""
          startTime="09:40"
          durationMinutes={60}
          currentPersonName=""
          currentHelperName=""
          onClose={vi.fn()}
          onStage={vi.fn()}
          onOutlineStage={vi.fn()}
        />
      </QueryClientProvider>,
    );
    await user.click(await screen.findByRole("button", { name: /Juan Pérez/ }));
    await screen.findByText(es.elegir);
    const helperCalls = vi
      .mocked(listMeetingPersons)
      .mock.calls.filter(([, options]) => options?.rotationScope?.holder === "helper");
    expect(helperCalls.length).toBeGreaterThan(0);
    expect(helperCalls[0]?.[0]).toBe("watchtowerReader");
    expect(helperCalls[0]?.[1]).toMatchObject({
      orderBy: "rotation",
      rotationScope: { partKeys: ["watchtower-study"], holder: "helper" },
    });
  });
});

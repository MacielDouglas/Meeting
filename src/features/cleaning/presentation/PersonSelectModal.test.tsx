// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateCleaningAssignment } from "@/features/cleaning/application/cleaning-program-actions";
import {
  getManyPersonCleaningHistories,
  listEligiblePersons,
} from "@/features/cleaning/application/cleaning-program-queries";
import { PersonSelectModal } from "@/features/cleaning/presentation/PersonSelectModal";
import { es } from "@/shared/i18n/es";

vi.mock("@/features/cleaning/application/cleaning-program-queries", () => ({
  getManyPersonCleaningHistories: vi.fn(),
  listEligiblePersons: vi.fn(),
}));
vi.mock("@/features/cleaning/application/cleaning-program-actions", () => ({
  updateCleaningAssignment: vi.fn(),
}));

const PERSONS = [
  {
    id: "p1",
    firstName: "Mario",
    lastName: "Pérez",
    sex: "male",
    cleaning: true,
    young: false,
    familyHead: false,
    familyMemberId: null,
  },
  {
    id: "p2",
    firstName: "Lucía",
    lastName: "Gómez",
    sex: "female",
    cleaning: true,
    young: false,
    familyHead: false,
    familyMemberId: null,
  },
] as const;

type ModalProps = ComponentProps<typeof PersonSelectModal>;

function renderModal(overrides: Partial<ModalProps> = {}): ModalProps {
  const props: ModalProps = {
    assignmentId: "assignment-1",
    sectorKey: "auditorio",
    sectorName: "Auditorio",
    typeKey: "per_meeting",
    currentPersonId: null,
    currentPersonName: "",
    requiredSex: "any",
    allowYoung: true,
    dayUsedPersonIds: [],
    onClose: vi.fn(),
    onUpdated: vi.fn(),
    ...overrides,
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <PersonSelectModal {...props} />
    </QueryClientProvider>,
  );
  return props;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getManyPersonCleaningHistories).mockResolvedValue(new Map());
  vi.mocked(updateCleaningAssignment).mockResolvedValue({ ok: true });
  vi.mocked(listEligiblePersons).mockImplementation((_requiredSex, options) => {
    const query = options?.search?.trim().toLowerCase();
    const list = query
      ? PERSONS.filter((person) =>
          `${person.firstName} ${person.lastName}`.toLowerCase().includes(query),
        )
      : PERSONS;
    return Promise.resolve([...list]);
  });
});

describe("PersonSelectModal", () => {
  it("abre el diálogo con título, buscador y personas cargadas", async () => {
    renderModal();

    expect(await screen.findByText("Designar para Auditorio")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: es.searchPeople })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Mario Pérez" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lucía Gómez" })).toBeInTheDocument();
  });

  it("filtra las personas al escribir en la búsqueda", async () => {
    const user = userEvent.setup();
    renderModal();

    const input = await screen.findByRole("textbox", { name: es.searchPeople });
    await user.type(input, "Luc");

    await waitFor(
      () => {
        expect(vi.mocked(listEligiblePersons)).toHaveBeenCalledWith("any", {
          search: "Luc",
          limit: 60,
        });
      },
      { timeout: 3000 },
    );
    expect(await screen.findByRole("button", { name: "Lucía Gómez" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mario Pérez" })).not.toBeInTheDocument();
  });

  it("al elegir una persona guarda la designación y avisa a los callbacks", async () => {
    const user = userEvent.setup();
    const { onUpdated, onClose } = renderModal();

    await user.click(await screen.findByRole("button", { name: "Mario Pérez" }));

    await waitFor(() => {
      expect(vi.mocked(updateCleaningAssignment)).toHaveBeenCalledWith("assignment-1", "p1");
      expect(onUpdated).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("muestra el estado vacío cuando nadie coincide con la búsqueda", async () => {
    vi.mocked(listEligiblePersons).mockResolvedValue([]);
    renderModal();

    expect(await screen.findByText(es.ningunaPersona)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mario Pérez" })).not.toBeInTheDocument();
  });

  it("cierra el diálogo con Cancelar", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(await screen.findByRole("button", { name: es.cancel }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});

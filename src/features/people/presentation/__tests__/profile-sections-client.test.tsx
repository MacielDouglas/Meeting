// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeaveOrganizationSection } from "@/features/organization/presentation/LeaveOrganizationSection-client";
import { MyPersonNameForm } from "@/features/people/presentation/MyPersonNameForm-client";
import { es } from "@/shared/i18n/es";

const updateMyPersonNameMock = vi.hoisted(() => vi.fn());
const leaveOrganizationMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/people/application/actions", () => ({
  updateMyPersonName: (...args: unknown[]) => updateMyPersonNameMock(...args),
}));

vi.mock("@/features/organization/application/organization-actions", () => ({
  leaveOrganization: (...args: unknown[]) => leaveOrganizationMock(...args),
}));

beforeEach(() => {
  updateMyPersonNameMock.mockReset();
  leaveOrganizationMock.mockReset();
});

describe("MyPersonNameForm", () => {
  it("salva o nome e mostra confirmação", async () => {
    const user = userEvent.setup();
    updateMyPersonNameMock.mockResolvedValue({ ok: true });
    render(<MyPersonNameForm initialFirstName="Ana" initialLastName="Paz" />);
    await user.clear(screen.getByLabelText(es.firstName));
    await user.type(screen.getByLabelText(es.firstName), "Anita");
    await user.click(screen.getByRole("button", { name: es.save }));
    expect(updateMyPersonNameMock).toHaveBeenCalledWith({ firstName: "Anita", lastName: "Paz" });
    expect(await screen.findByRole("status")).toHaveTextContent(es.nombreGuardado);
  });

  it("mostra alerta quando a action falha", async () => {
    const user = userEvent.setup();
    updateMyPersonNameMock.mockResolvedValue({ ok: false, error: "Sin vínculo" });
    render(<MyPersonNameForm initialFirstName="Ana" initialLastName="Paz" />);
    await user.click(screen.getByRole("button", { name: es.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sin vínculo");
  });
});

describe("LeaveOrganizationSection", () => {
  async function confirmLeave() {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: es.salirOrganizacion }));
    const dialog = await screen.findByRole("alertdialog");
    // O confirmar vive dentro do diálogo (o botão do cartão fica atrás).
    await user.click(within(dialog).getByRole("button", { name: es.salirOrganizacion }));
  }

  it("pede confirmação e sai", async () => {
    leaveOrganizationMock.mockResolvedValue({ ok: true });
    render(<LeaveOrganizationSection />);
    await confirmLeave();
    expect(leaveOrganizationMock).toHaveBeenCalledTimes(1);
  });

  it("cancela sem confirmar", async () => {
    const user = userEvent.setup();
    render(<LeaveOrganizationSection />);
    await user.click(screen.getByRole("button", { name: es.salirOrganizacion }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: es.cancel }));
    expect(leaveOrganizationMock).not.toHaveBeenCalled();
  });

  it("mostra alerta quando a action falha", async () => {
    leaveOrganizationMock.mockResolvedValue({ ok: false, error: "El owner no puede salir" });
    render(<LeaveOrganizationSection />);
    await confirmLeave();
    expect(await screen.findByRole("alert")).toHaveTextContent("El owner no puede salir");
  });
});

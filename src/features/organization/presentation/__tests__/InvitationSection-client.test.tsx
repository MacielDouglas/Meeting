// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvitationSection } from "@/features/organization/presentation/InvitationSection-client";
import { es } from "@/shared/i18n/es";

const createInvitationMock = vi.hoisted(() => vi.fn());
const cancelInvitationMock = vi.hoisted(() => vi.fn());
const redeemInvitationMock = vi.hoisted(() => vi.fn());
const resendInvitationMock = vi.hoisted(() => vi.fn());
const routerRefresh = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("@/features/organization/application/organization-actions", () => ({
  createInvitation: (...args: unknown[]) => createInvitationMock(...args),
  cancelInvitation: (...args: unknown[]) => cancelInvitationMock(...args),
  redeemInvitation: (...args: unknown[]) => redeemInvitationMock(...args),
  resendInvitation: (...args: unknown[]) => resendInvitationMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerRefresh,
}));

const persons = [{ id: "p1", label: "Juan Pérez" }];

beforeEach(() => {
  createInvitationMock.mockReset();
  cancelInvitationMock.mockReset();
  redeemInvitationMock.mockReset();
  resendInvitationMock.mockReset();
  routerRefresh.refresh.mockReset();
});

describe("InvitationSection", () => {
  it("mostra estado vazio sem convites", () => {
    render(<InvitationSection initial={[]} persons={[]} userIdByEmail={{}} />);
    expect(screen.getByText(es.invitaciones)).toBeInTheDocument();
    expect(screen.getByText(es.sinInvitaciones)).toBeInTheDocument();
  });

  it("lista convites com estado da conta e ações certas", () => {
    render(
      <InvitationSection
        persons={persons}
        userIdByEmail={{ "ana@example.com": "u2" }}
        initial={[
          {
            id: "inv1",
            email: "ana@example.com",
            role: "member",
            status: "pending",
            expiresAt: "2026-10-02T00:00:00.000Z",
            createdAt: "2026-09-25T00:00:00.000Z",
            hasAccount: true,
          },
          {
            id: "inv2",
            email: "nueva@example.com",
            role: "admin",
            status: "pending",
            expiresAt: "2026-10-02T00:00:00.000Z",
            createdAt: "2026-09-25T00:00:00.000Z",
            hasAccount: false,
          },
        ]}
      />,
    );
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText(es.cuentaLista)).toBeInTheDocument();
    expect(screen.getByText(es.esperandoLogin)).toBeInTheDocument();
    // Só quem já tem conta pode ser admitido.
    expect(screen.getAllByRole("button", { name: es.admitir })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: es.cancelarInvitacion })).toHaveLength(2);
  });

  it("cria convite com e-mail e papel e atualiza", async () => {
    const user = userEvent.setup();
    createInvitationMock.mockResolvedValue({ ok: true });
    render(<InvitationSection initial={[]} persons={[]} userIdByEmail={{}} />);
    await user.type(screen.getByLabelText(es.invitarCorreo), "ana@example.com");
    await user.selectOptions(screen.getByLabelText(es.role), "admin");
    await user.click(screen.getByRole("button", { name: es.invitar }));
    expect(createInvitationMock).toHaveBeenCalledWith({ email: "ana@example.com", role: "admin" });
    await waitFor(() => expect(routerRefresh.refresh).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("status")).toHaveTextContent(es.invitacionCreada);
  });

  it("admite vinculando a pessoa existente", async () => {
    const user = userEvent.setup();
    redeemInvitationMock.mockResolvedValue({ ok: true, userName: "Ana" });
    render(
      <InvitationSection
        persons={persons}
        userIdByEmail={{ "ana@example.com": "u2" }}
        initial={[
          {
            id: "inv1",
            email: "ana@example.com",
            role: "member",
            status: "pending",
            expiresAt: "2026-10-02T00:00:00.000Z",
            createdAt: "2026-09-25T00:00:00.000Z",
            hasAccount: true,
          },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: es.admitir }));
    const form = await screen.findByLabelText(es.elegirPersona);
    expect(within(form.closest("form") as HTMLElement).getByText("Juan Pérez")).toBeInTheDocument();
    await user.click(
      within(form.closest("form") as HTMLElement).getByRole("button", { name: es.admitir }),
    );
    expect(redeemInvitationMock).toHaveBeenCalledWith({
      id: "inv1",
      role: "member",
      personId: "p1",
    });
    await waitFor(() => expect(routerRefresh.refresh).toHaveBeenCalledTimes(1));
  });

  it("admite criando a pessoa básica", async () => {
    const user = userEvent.setup();
    redeemInvitationMock.mockResolvedValue({ ok: true, userName: "Bob" });
    render(
      <InvitationSection
        persons={[]}
        userIdByEmail={{ "bob@example.com": "u3" }}
        initial={[
          {
            id: "inv3",
            email: "bob@example.com",
            role: "admin",
            status: "pending",
            expiresAt: "2026-10-02T00:00:00.000Z",
            createdAt: "2026-09-25T00:00:00.000Z",
            hasAccount: true,
          },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: es.admitir }));
    const mode = await screen.findByLabelText(es.elegirPersona);
    const form = mode.closest("form") as HTMLElement;
    await user.selectOptions(mode, "basic");
    await user.type(within(form).getByLabelText(es.firstName), "Bob");
    await user.type(within(form).getByLabelText(es.lastName), "Santos");
    await user.click(within(form).getByRole("button", { name: es.admitir }));
    expect(redeemInvitationMock).toHaveBeenCalledWith({
      id: "inv3",
      role: "admin",
      newPerson: { firstName: "Bob", lastName: "Santos", sex: "male", young: false },
    });
    await waitFor(() => expect(routerRefresh.refresh).toHaveBeenCalledTimes(1));
  });

  it("oferece criar a pessoa completa com o usuário pré-selecionado", async () => {
    const user = userEvent.setup();
    render(
      <InvitationSection
        persons={persons}
        userIdByEmail={{ "ana@example.com": "u2" }}
        initial={[
          {
            id: "inv1",
            email: "ana@example.com",
            role: "member",
            status: "pending",
            expiresAt: "2026-10-02T00:00:00.000Z",
            createdAt: "2026-09-25T00:00:00.000Z",
            hasAccount: true,
          },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: es.admitir }));
    expect(await screen.findByRole("link", { name: es.personaCompleta })).toHaveAttribute(
      "href",
      "/administracion/personas/nueva?userId=u2",
    );
  });

  it("convite vencido mostra Reenviar em vez de Admitir", async () => {
    const user = userEvent.setup();
    resendInvitationMock.mockResolvedValue({ ok: true });
    render(
      <InvitationSection
        persons={persons}
        userIdByEmail={{ "vieja@example.com": "u9" }}
        initial={[
          {
            id: "inv9",
            email: "vieja@example.com",
            role: "admin",
            status: "pending",
            expiresAt: "2020-01-01T00:00:00.000Z",
            createdAt: "2019-12-20T00:00:00.000Z",
            hasAccount: true,
          },
        ]}
      />,
    );
    expect(screen.getByText(es.invitacionVencida)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: es.admitir })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: es.reenviarInvitacion }));
    expect(resendInvitationMock).toHaveBeenCalledWith({ id: "inv9" });
    expect(await screen.findByRole("status")).toHaveTextContent(es.invitacionReenviada);
    await waitFor(() => expect(routerRefresh.refresh).toHaveBeenCalledTimes(1));
  });
});

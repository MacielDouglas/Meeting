// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserWithRole } from "@/features/people/application/queries";
import { UserList } from "@/features/people/presentation/UserList";
import { es } from "@/shared/i18n/es";

const updateUserRoleMock = vi.hoisted(() => vi.fn());
const removeUserMock = vi.hoisted(() => vi.fn());
const linkUserMock = vi.hoisted(() => vi.fn());
const routerRefresh = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("@/features/people/application/actions", () => ({
  updateUserRole: (...args: unknown[]) => updateUserRoleMock(...args),
  linkUserToPerson: (...args: unknown[]) => linkUserMock(...args),
}));

vi.mock("@/features/organization/application/organization-actions", () => ({
  removeUserFromOrganization: (...args: unknown[]) => removeUserMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerRefresh,
}));

const users: UserWithRole[] = [
  { id: "u1", name: "Ana", email: "ana@example.com", role: "owner", linkedPersonName: "Ana Paz" },
  { id: "u2", name: "Bob", email: "bob@example.com", role: "member", linkedPersonName: null },
];

beforeEach(() => {
  updateUserRoleMock.mockReset();
  removeUserMock.mockReset();
  linkUserMock.mockReset();
  routerRefresh.refresh.mockReset();
});

describe("UserList", () => {
  it("mostra es.noUsers quando vazio", () => {
    render(<UserList users={[]} currentUserId="u1" isOwner />);
    expect(screen.getByText(es.noUsers)).toBeInTheDocument();
  });

  it("exibe nome, e-mail, pessoa vinculada e badges de papel", () => {
    render(<UserList users={users} currentUserId="u9" isOwner={false} />);
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText(`${es.linkedPerson}: Ana Paz`)).toBeInTheDocument();
    expect(screen.getByText("owner")).toBeInTheDocument();
    expect(screen.getByText("member")).toBeInTheDocument();
  });

  it("owner vê seletor só para os outros usuários", () => {
    render(<UserList users={users} currentUserId="u1" isOwner />);
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("não oferece o seletor para outro owner (só badge)", () => {
    render(
      <UserList
        users={[
          ...users,
          {
            id: "u3",
            name: "Lia",
            email: "lia@example.com",
            role: "owner",
            linkedPersonName: null,
          },
        ]}
        currentUserId="u1"
        isOwner
      />,
    );
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    expect(screen.getAllByText("owner")).toHaveLength(2);
  });

  it("não-owner não vê seletor de papel", () => {
    render(<UserList users={users} currentUserId="u9" isOwner={false} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("troca o papel e atualiza a lista em caso de sucesso", async () => {
    const user = userEvent.setup();
    updateUserRoleMock.mockResolvedValue({ ok: true });
    render(<UserList users={users} currentUserId="u1" isOwner />);
    await user.selectOptions(screen.getByRole("combobox"), "admin");
    expect(updateUserRoleMock).toHaveBeenCalledWith({ userId: "u2", role: "admin" });
    await waitFor(() => expect(routerRefresh.refresh).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mostra alerta e não atualiza quando a action falha", async () => {
    const user = userEvent.setup();
    updateUserRoleMock.mockResolvedValue({ ok: false, error: "Sin permiso" });
    render(<UserList users={users} currentUserId="u1" isOwner />);
    await user.selectOptions(screen.getByRole("combobox"), "admin");
    expect(await screen.findByRole("alert")).toHaveTextContent("Sin permiso");
    expect(routerRefresh.refresh).not.toHaveBeenCalled();
  });

  it("owner vê o código de entrada ativo do membro", () => {
    render(
      <UserList
        users={users}
        currentUserId="u1"
        isOwner
        joinTokenByUserId={{ u2: { code: "ABC-DEF-GHJ", expiresAt: "2026-10-02T00:00:00.000Z" } }}
      />,
    );
    expect(screen.getByText(/ABC-DEF-GHJ/)).toBeInTheDocument();
    expect(screen.getByText(/2026-10-02/)).toBeInTheDocument();
  });

  it("não-owner não vê códigos mesmo quando existem", () => {
    render(
      <UserList
        users={users}
        currentUserId="u9"
        isOwner={false}
        joinTokenByUserId={{ u2: { code: "ABC-DEF-GHJ", expiresAt: "2026-10-02T00:00:00.000Z" } }}
      />,
    );
    expect(screen.queryByText(/ABC-DEF-GHJ/)).not.toBeInTheDocument();
  });

  it("owner não vê linha de código para quem não gerou", () => {
    render(<UserList users={users} currentUserId="u1" isOwner joinTokenByUserId={{}} />);
    expect(screen.queryByText(es.codigoEntrada, { exact: false })).not.toBeInTheDocument();
  });

  it("owner vê Excluir só para os outros usuários", () => {
    render(<UserList users={users} currentUserId="u1" isOwner />);
    expect(screen.getAllByRole("button", { name: es.excluirUsuario })).toHaveLength(1);
  });

  it("não-owner não vê Excluir", () => {
    render(<UserList users={users} currentUserId="u9" isOwner={false} />);
    expect(screen.queryByRole("button", { name: es.excluirUsuario })).not.toBeInTheDocument();
  });

  it("abre o modal de remoção com os dados do usuário", async () => {
    const user = userEvent.setup();
    render(<UserList users={users} currentUserId="u1" isOwner />);
    await user.click(screen.getByRole("button", { name: es.excluirUsuario }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(es.confirmRemoverUsuario)).toBeInTheDocument();
    expect(within(dialog).getByText("Bob · bob@example.com")).toBeInTheDocument();
    expect(removeUserMock).not.toHaveBeenCalled();
  });

  it("cancela a remoção sem chamar a action", async () => {
    const user = userEvent.setup();
    render(<UserList users={users} currentUserId="u1" isOwner />);
    await user.click(screen.getByRole("button", { name: es.excluirUsuario }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: es.cancel }));
    expect(removeUserMock).not.toHaveBeenCalled();
    expect(routerRefresh.refresh).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("confirma a remoção e atualiza", async () => {
    const user = userEvent.setup();
    removeUserMock.mockResolvedValue({ ok: true, userName: "Bob" });
    render(<UserList users={users} currentUserId="u1" isOwner />);
    await user.click(screen.getByRole("button", { name: es.excluirUsuario }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: es.excluir }));
    expect(removeUserMock).toHaveBeenCalledWith({ id: "u2" });
    await waitFor(() => expect(routerRefresh.refresh).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("mostra alerta no modal quando a remoção falha", async () => {
    const user = userEvent.setup();
    removeUserMock.mockResolvedValue({ ok: false, error: "Solo el owner" });
    render(<UserList users={users} currentUserId="u1" isOwner />);
    await user.click(screen.getByRole("button", { name: es.excluirUsuario }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: es.excluir }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Solo el owner");
    expect(routerRefresh.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("owner vincula usuário a pessoa livre filtrada", async () => {
    const user = userEvent.setup();
    linkUserMock.mockResolvedValue({ ok: true });
    render(
      <UserList
        users={users}
        currentUserId="u1"
        isOwner
        unlinkedPersons={[{ id: "p1", label: "Juan Pérez" }]}
      />,
    );
    // Só o usuário sem persona vinculada mostra o seletor.
    expect(screen.getAllByLabelText(es.vincularPersona)).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: es.vincular }));
    expect(linkUserMock).toHaveBeenCalledWith({ userId: "u2", personId: "p1" });
    await waitFor(() => expect(routerRefresh.refresh).toHaveBeenCalledTimes(1));
  });

  it("mostra aviso sem pessoas livres e esconde vínculo de quem já tem", () => {
    render(<UserList users={users} currentUserId="u1" isOwner unlinkedPersons={[]} />);
    expect(screen.queryByLabelText(es.vincularPersona)).not.toBeInTheDocument();
    expect(screen.getByText(es.sinPersonasLibres)).toBeInTheDocument();
  });

  it("não-owner não vê vínculo", () => {
    render(
      <UserList
        users={users}
        currentUserId="u9"
        isOwner={false}
        unlinkedPersons={[{ id: "p1", label: "Juan Pérez" }]}
      />,
    );
    expect(screen.queryByLabelText(es.vincularPersona)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: es.vincular })).not.toBeInTheDocument();
  });

  it("mostra alerta quando o vínculo falha", async () => {
    const user = userEvent.setup();
    linkUserMock.mockResolvedValue({ ok: false, error: "Persona no encontrada." });
    render(
      <UserList
        users={users}
        currentUserId="u1"
        isOwner
        unlinkedPersons={[{ id: "p1", label: "Juan Pérez" }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: es.vincular }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Persona no encontrada.");
    expect(routerRefresh.refresh).not.toHaveBeenCalled();
  });
});

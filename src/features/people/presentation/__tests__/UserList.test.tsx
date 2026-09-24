// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserWithRole } from "@/features/people/application/queries";
import { UserList } from "@/features/people/presentation/UserList";
import { es } from "@/shared/i18n/es";

const updateUserRoleMock = vi.hoisted(() => vi.fn());
const routerRefresh = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("@/features/people/application/actions", () => ({
  updateUserRole: (...args: unknown[]) => updateUserRoleMock(...args),
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
});

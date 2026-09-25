// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JoinTokenSection } from "@/features/organization/presentation/JoinTokenSection-client";
import { MyEntryCode } from "@/features/organization/presentation/MyEntryCode-client";
import { RenameOrganizationForm } from "@/features/organization/presentation/RenameOrganizationForm-client";
import { es } from "@/shared/i18n/es";

const renameOrganizationMock = vi.hoisted(() => vi.fn());
const redeemJoinTokenMock = vi.hoisted(() => vi.fn());
const createJoinTokenMock = vi.hoisted(() => vi.fn());
const routerRefresh = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("@/features/organization/application/organization-actions", () => ({
  renameOrganization: (...args: unknown[]) => renameOrganizationMock(...args),
  redeemJoinToken: (...args: unknown[]) => redeemJoinTokenMock(...args),
  createJoinToken: (...args: unknown[]) => createJoinTokenMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerRefresh,
}));

beforeEach(() => {
  renameOrganizationMock.mockReset();
  redeemJoinTokenMock.mockReset();
  createJoinTokenMock.mockReset();
  routerRefresh.refresh.mockReset();
});

describe("RenameOrganizationForm", () => {
  it("salva o nome e mostra confirmação", async () => {
    const user = userEvent.setup();
    renameOrganizationMock.mockResolvedValue({ ok: true });
    render(<RenameOrganizationForm initialName="Antiga" />);
    await user.clear(screen.getByLabelText(es.congregacion));
    await user.type(screen.getByLabelText(es.congregacion), "Cong. Norte");
    await user.click(screen.getByRole("button", { name: es.save }));
    expect(renameOrganizationMock).toHaveBeenCalledWith({ name: "Cong. Norte" });
    expect(await screen.findByRole("status")).toHaveTextContent(es.nombreGuardado);
  });

  it("mostra alerta quando a action falha", async () => {
    const user = userEvent.setup();
    renameOrganizationMock.mockResolvedValue({ ok: false, error: "Solo el owner" });
    render(<RenameOrganizationForm initialName="Antiga" />);
    await user.click(screen.getByRole("button", { name: es.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Solo el owner");
  });
});

describe("JoinTokenSection", () => {
  const persons = [{ id: "p1", label: "Juan Pérez" }];

  it("mostra estado vazio sem códigos", () => {
    render(<JoinTokenSection initial={[]} persons={[]} />);
    expect(screen.getByText(es.tokensEntrada)).toBeInTheDocument();
    expect(screen.getByText(es.sinTokens)).toBeInTheDocument();
  });

  it("admite vinculando pessoa com o papel do seletor", async () => {
    const user = userEvent.setup();
    redeemJoinTokenMock.mockResolvedValue({ ok: true, userName: "Ana" });
    render(
      <JoinTokenSection
        persons={persons}
        initial={[
          {
            id: "t1",
            code: "ABC-DEF-GHJ",
            userId: "u2",
            userName: "Ana",
            userEmail: "ana@example.com",
            expiresAt: "2026-10-02T00:00:00.000Z",
          },
        ]}
      />,
    );
    expect(screen.getByText("ABC-DEF-GHJ")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: es.admitir }));
    const form = (await screen.findByLabelText(es.elegirPersona)).closest("form") as HTMLElement;
    await user.selectOptions(within(form).getByLabelText(es.role), "admin");
    await user.click(within(form).getByRole("button", { name: es.admitir }));
    expect(redeemJoinTokenMock).toHaveBeenCalledWith({
      code: "ABC-DEF-GHJ",
      role: "admin",
      personId: "p1",
    });
    await waitFor(() => expect(routerRefresh.refresh).toHaveBeenCalledTimes(1));
  });

  it("exige pessoa antes de admitir", async () => {
    const user = userEvent.setup();
    render(
      <JoinTokenSection
        persons={[]}
        initial={[
          {
            id: "t1",
            code: "ABC-DEF-GHJ",
            userId: "u2",
            userName: "Ana",
            userEmail: "ana@example.com",
            expiresAt: "2026-10-02T00:00:00.000Z",
          },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: es.admitir }));
    const form = (await screen.findByLabelText(es.elegirPersona)).closest("form") as HTMLElement;
    await user.selectOptions(within(form).getByLabelText(es.elegirPersona), "existing");
    expect(within(form).getByText(es.sinPersonasLibres)).toBeInTheDocument();
    await user.click(within(form).getByRole("button", { name: es.admitir }));
    expect(redeemJoinTokenMock).not.toHaveBeenCalled();
    expect(within(form).getByRole("alert")).toHaveTextContent(es.eligePersonaObligatorio);
  });
});

describe("MyEntryCode", () => {
  it("pede para gerar quando não há código", () => {
    render(<MyEntryCode initial={null} />);
    expect(screen.getByRole("button", { name: es.generarCodigo })).toBeInTheDocument();
    expect(screen.queryByLabelText(es.codigoEntrada)).not.toBeInTheDocument();
  });

  it("exibe o código inicial com vencimento", () => {
    render(
      <MyEntryCode initial={{ code: "ABC-DEF-GHJ", expiresAt: "2026-10-02T00:00:00.000Z" }} />,
    );
    expect(screen.getByLabelText(es.codigoEntrada)).toHaveTextContent("ABC-DEF-GHJ");
    expect(screen.getByRole("button", { name: es.generarNuevoCodigo })).toBeInTheDocument();
  });

  it("gera e mostra o código novo", async () => {
    const user = userEvent.setup();
    createJoinTokenMock.mockResolvedValue({
      ok: true,
      code: "XYZ-ABC-DEF",
      expiresAt: "2026-10-02T00:00:00.000Z",
    });
    render(<MyEntryCode initial={null} />);
    await user.click(screen.getByRole("button", { name: es.generarCodigo }));
    expect(createJoinTokenMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByLabelText(es.codigoEntrada)).toHaveTextContent("XYZ-ABC-DEF");
  });
});

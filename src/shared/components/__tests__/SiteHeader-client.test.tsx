// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/shared/components/SiteHeader-client";
import { es } from "@/shared/i18n/es";

const navState = vi.hoisted(() => ({ pathname: "/", tab: "" }));
const routerMocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
const signOutMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => navState.pathname,
  useRouter: () => routerMocks,
  useSearchParams: () => new URLSearchParams(navState.tab === "" ? "" : `tab=${navState.tab}`),
}));

vi.mock("@/features/auth/presentation/auth-client", () => ({
  authClient: { signOut: (...args: unknown[]) => signOutMock(...args) },
}));

interface HeaderProps {
  showSettings: boolean;
  showAdmin: boolean;
  isAuthed: boolean;
  congregationName: string;
}

const baseProps: HeaderProps = {
  showSettings: false,
  showAdmin: false,
  isAuthed: false,
  congregationName: "Congregación Norte",
};

function renderHeader(overrides: Partial<HeaderProps> = {}) {
  return render(<SiteHeader {...baseProps} {...overrides} />);
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: es.menu }));
}

beforeEach(() => {
  navState.pathname = "/";
  navState.tab = "";
  routerMocks.push.mockReset();
  routerMocks.refresh.mockReset();
  signOutMock.mockReset();
  signOutMock.mockResolvedValue({});
  document.documentElement.classList.remove("dark", "light");
  window.localStorage.clear();
});

describe("SiteHeader", () => {
  it("mostra link de login para visitante sem flags", async () => {
    const user = userEvent.setup();
    renderHeader();
    await openMenu(user);
    const menu = screen.getByRole("navigation", { name: es.menu });
    expect(within(menu).getByRole("link", { name: es.signInTitle })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(screen.queryByRole("link", { name: es.usersTab })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: es.asignar })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: es.configuracion })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: es.people })).not.toBeInTheDocument();
  });

  it("mostra itens de admin e ajustes conforme as flags", async () => {
    const user = userEvent.setup();
    renderHeader({ showAdmin: true, showSettings: true, isAuthed: true });
    await openMenu(user);
    const menu = screen.getByRole("navigation", { name: es.menu });
    expect(within(menu).getByRole("link", { name: es.people })).toHaveAttribute(
      "href",
      "/personas",
    );
    expect(within(menu).getByRole("link", { name: es.usersTab })).toHaveAttribute(
      "href",
      "/personas?tab=usuarios",
    );
    expect(within(menu).getByRole("link", { name: es.asignar })).toHaveAttribute(
      "href",
      "/asignar",
    );
    expect(within(menu).getByRole("link", { name: es.configuracion })).toHaveAttribute(
      "href",
      "/configuracion",
    );
    expect(within(menu).queryByRole("link", { name: es.signInTitle })).not.toBeInTheDocument();
  });

  it("marca o item ativo da navegação desktop com aria-current", () => {
    navState.pathname = "/reunioes";
    renderHeader({ showAdmin: true, isAuthed: true });
    const desktop = screen.getByRole("navigation", { name: "Navegación principal" });
    const links = desktop.querySelectorAll("a");
    const active = Array.from(links).filter((a) => a.getAttribute("aria-current") === "page");
    expect(active.map((a) => a.textContent)).toEqual([es.tabReuniones]);
  });

  it("abre e fecha o menu mobile alternando aria-expanded", async () => {
    const user = userEvent.setup();
    renderHeader();
    const toggle = screen.getByRole("button", { name: es.menu });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(screen.getByRole("button", { name: es.closeMenu })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("navigation", { name: es.menu })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: es.closeMenu }));
    expect(screen.queryByRole("navigation", { name: es.menu })).not.toBeInTheDocument();
  });

  it("fecha o menu mobile com Escape", async () => {
    const user = userEvent.setup();
    renderHeader();
    await openMenu(user);
    expect(screen.getByRole("navigation", { name: es.menu })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("navigation", { name: es.menu })).not.toBeInTheDocument();
  });

  it("alterna o tema e troca o aria-label do botão", async () => {
    const user = userEvent.setup();
    renderHeader();
    const toDark = screen.getByRole("button", { name: es.switchToDark });
    await user.click(toDark);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("reuniones-theme")).toBe("dark");
    const toLight = screen.getByRole("button", { name: es.switchToLight });
    await user.click(toLight);
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(window.localStorage.getItem("reuniones-theme")).toBe("light");
    expect(screen.getByRole("button", { name: es.switchToDark })).toBeInTheDocument();
  });

  it("chama signOut e redireciona ao clicar em sair", async () => {
    const user = userEvent.setup();
    renderHeader({ isAuthed: true });
    await user.click(screen.getByRole("button", { name: es.signOut }));
    expect(signOutMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(routerMocks.push).toHaveBeenCalledWith("/"));
    expect(routerMocks.refresh).toHaveBeenCalledTimes(1);
  });
});

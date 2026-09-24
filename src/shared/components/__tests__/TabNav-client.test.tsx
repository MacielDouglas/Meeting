// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TabNav } from "@/shared/components/TabNav-client";

const searchState = vi.hoisted(() => ({ query: "" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(searchState.query),
}));

const items = [
  { value: "personas", label: "Personas", href: "/personas?tab=personas" },
  { value: "usuarios", label: "Usuarios", href: "/personas?tab=usuarios" },
];

beforeEach(() => {
  searchState.query = "";
});

describe("TabNav", () => {
  it("marca a aba ativa conforme o ?tab= da URL", () => {
    searchState.query = "tab=usuarios";
    render(<TabNav items={items} defaultValue="personas" ariaLabel="Secciones de personas" />);
    expect(screen.getByRole("link", { name: "Usuarios" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Personas" })).not.toHaveAttribute("aria-current");
  });

  it("usa defaultValue quando o parâmetro está ausente", () => {
    render(<TabNav items={items} defaultValue="personas" ariaLabel="Secciones de personas" />);
    expect(screen.getByRole("link", { name: "Personas" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Usuarios" })).not.toHaveAttribute("aria-current");
  });

  it("usa defaultValue quando o valor da URL não corresponde a nenhuma aba", () => {
    searchState.query = "tab=inexistente";
    render(<TabNav items={items} defaultValue="personas" ariaLabel="Secciones de personas" />);
    expect(screen.getByRole("link", { name: "Personas" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Usuarios" })).not.toHaveAttribute("aria-current");
  });

  it("renderiza hrefs corretos e o aria-label da navegação", () => {
    render(<TabNav items={items} defaultValue="personas" ariaLabel="Secciones de personas" />);
    expect(screen.getByRole("navigation", { name: "Secciones de personas" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Personas" })).toHaveAttribute(
      "href",
      "/personas?tab=personas",
    );
    expect(screen.getByRole("link", { name: "Usuarios" })).toHaveAttribute(
      "href",
      "/personas?tab=usuarios",
    );
  });

  it("respeita um nome de parâmetro customizado", () => {
    searchState.query = "secao=usuarios";
    render(
      <TabNav
        items={items}
        param="secao"
        defaultValue="personas"
        ariaLabel="Secciones de personas"
      />,
    );
    expect(screen.getByRole("link", { name: "Usuarios" })).toHaveAttribute("aria-current", "page");
  });
});

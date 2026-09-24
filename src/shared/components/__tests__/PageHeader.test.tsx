// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "@/shared/components/PageHeader";

describe("PageHeader", () => {
  it("renderiza o título como heading", () => {
    render(<PageHeader title="Personas" />);
    expect(screen.getByRole("heading", { name: "Personas" })).toBeInTheDocument();
  });

  it("renderiza descrição e meta quando informadas", () => {
    render(<PageHeader title="Personas" description="Gestiona las personas." meta="2 registros" />);
    expect(screen.getByText("Gestiona las personas.")).toBeInTheDocument();
    expect(screen.getByText("2 registros")).toBeInTheDocument();
  });

  it("omite descrição e meta quando ausentes", () => {
    const { container } = render(<PageHeader title="Personas" />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("renderiza ações à direita quando informadas", () => {
    render(<PageHeader title="Personas" actions={<button type="button">Nueva persona</button>} />);
    expect(screen.getByRole("button", { name: "Nueva persona" })).toBeInTheDocument();
  });
});

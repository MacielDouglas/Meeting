// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { PersonSummary } from "@/features/people/domain/person";
import { PersonList } from "@/features/people/presentation/PersonList";
import { es } from "@/shared/i18n/es";

const persons: PersonSummary[] = [
  { id: "1", firstName: "Juan", lastName: "Pérez", sex: "male" },
  { id: "2", firstName: "María", lastName: "López", sex: "female" },
];

describe("PersonList", () => {
  it("lista todas as pessoas", () => {
    render(<PersonList persons={persons} canCreate={false} />);
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("María López")).toBeInTheDocument();
  });

  it("liga cada pessoa à sua página de edição", () => {
    render(<PersonList persons={persons} canCreate={false} />);
    expect(screen.getByRole("link", { name: /Juan Pérez/ })).toHaveAttribute(
      "href",
      "/administracion/personas/1/editar",
    );
    expect(screen.getByRole("link", { name: /María López/ })).toHaveAttribute(
      "href",
      "/administracion/personas/2/editar",
    );
  });

  it("filtra pela busca", async () => {
    const user = userEvent.setup();
    render(<PersonList persons={persons} canCreate={false} />);
    await user.type(screen.getByRole("searchbox", { name: es.searchPeople }), "maría");
    expect(screen.queryByText("Juan Pérez")).not.toBeInTheDocument();
    expect(screen.getByText("María López")).toBeInTheDocument();
  });

  it("mostra es.ningunaPersona quando a busca não encontra ninguém", async () => {
    const user = userEvent.setup();
    render(<PersonList persons={persons} canCreate={false} />);
    await user.type(screen.getByRole("searchbox", { name: es.searchPeople }), "zzz");
    expect(screen.getByText(es.ningunaPersona)).toBeInTheDocument();
    expect(screen.queryByText("Juan Pérez")).not.toBeInTheDocument();
  });

  it("expõe Hermano/Hermana só para leitor de tela", () => {
    const { container } = render(<PersonList persons={persons} canCreate={false} />);
    const hidden = Array.from(container.querySelectorAll("span.sr-only")).map(
      (el) => el.textContent,
    );
    expect(hidden).toEqual([es.brother, es.sister]);
  });

  it("mostra estado vazio com es.noPeople", () => {
    render(<PersonList persons={[]} canCreate={false} />);
    expect(screen.getByText(es.noPeople)).toBeInTheDocument();
  });

  it("mostra o atalho de nova pessoa só quando pode criar", () => {
    const { rerender } = render(<PersonList persons={persons} canCreate={false} />);
    expect(screen.queryByRole("link", { name: es.newPerson })).not.toBeInTheDocument();
    rerender(<PersonList persons={persons} canCreate />);
    expect(screen.getByRole("link", { name: es.newPerson })).toHaveAttribute(
      "href",
      "/administracion/personas/nueva",
    );
  });
});

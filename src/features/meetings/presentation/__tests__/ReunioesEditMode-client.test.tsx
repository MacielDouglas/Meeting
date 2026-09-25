// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  ReunioesEditModeToggle,
  useReunioesEditMode,
} from "@/features/meetings/presentation/ReunioesEditMode-client";
import { es } from "@/shared/i18n/es";

const STORAGE_KEY = "reunioes-edit-mode";

afterEach(() => {
  window.localStorage.removeItem(STORAGE_KEY);
});

describe("ReunioesEditModeToggle", () => {
  it("empieza apagado y enciende el modo edición al activar", async () => {
    const user = userEvent.setup();
    render(<ReunioesEditModeToggle />);

    const toggle = screen.getByRole("switch", { name: es.modoEdicion });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("1");
  });

  it("respeta el modo edición ya guardado", () => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    render(<ReunioesEditModeToggle />);

    expect(screen.getByRole("switch", { name: es.modoEdicion })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("expone el estado via hook para las abas Reuniones y Oradores", () => {
    window.localStorage.setItem(STORAGE_KEY, "1");

    function Probe() {
      const editMode = useReunioesEditMode();
      return <p>{editMode ? "edicion" : "lectura"}</p>;
    }
    render(<Probe />);
    expect(screen.getByText("edicion")).toBeInTheDocument();
  });

  it("sincroniza los suscriptores al cambiar (misma aba y entre abas)", async () => {
    const user = userEvent.setup();

    function Probe() {
      const editMode = useReunioesEditMode();
      return <p>{editMode ? "edicion" : "lectura"}</p>;
    }
    render(
      <>
        <ReunioesEditModeToggle />
        <Probe />
      </>,
    );

    expect(screen.getByText("lectura")).toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: es.modoEdicion }));
    expect(screen.getByText("edicion")).toBeInTheDocument();
  });
});

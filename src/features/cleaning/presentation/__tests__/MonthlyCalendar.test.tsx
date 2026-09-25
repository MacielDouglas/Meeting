// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MonthlyCalendar } from "@/features/cleaning/presentation/MonthlyCalendar";
import { es } from "@/shared/i18n/es";

const days = [
  {
    date: "2026-01-04",
    isMidweek: false,
    isWeekend: true,
    assemblyType: null,
    celebrationReplacement: false,
  },
  {
    date: "2026-01-10",
    isMidweek: false,
    isWeekend: false,
    assemblyType: "Asamblea regional",
    celebrationReplacement: false,
  },
];

function renderCalendar(overrides = {}) {
  const props = {
    year: 2026,
    month: 0,
    onPrevMonth: vi.fn(),
    onNextMonth: vi.fn(),
    days,
    selectedDates: new Set(["2026-01-07"]),
    programDates: new Set(["2026-01-14"]),
    onDateClick: vi.fn(),
    ...overrides,
  };
  const result = render(<MonthlyCalendar {...props} />);
  return { ...result, props };
}

describe("MonthlyCalendar", () => {
  it("mostra o heading do mês e os dias da semana", () => {
    renderCalendar();
    expect(screen.getByRole("heading", { name: "Enero 2026" })).toBeInTheDocument();
    for (const header of ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]) {
      expect(screen.getByText(header)).toBeInTheDocument();
    }
  });

  it("navega entre meses pelos callbacks", async () => {
    const user = userEvent.setup();
    const { props } = renderCalendar();
    await user.click(screen.getByRole("button", { name: "Mes anterior" }));
    await user.click(screen.getByRole("button", { name: "Próximo mes" }));
    expect(props.onPrevMonth).toHaveBeenCalledTimes(1);
    expect(props.onNextMonth).toHaveBeenCalledTimes(1);
  });

  it("rotula cada data com estado no aria-label", () => {
    renderCalendar();
    expect(screen.getByRole("button", { name: "7 de enero, seleccionado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "14 de enero, con programa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4 de enero, reunión" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10 de enero, asamblea" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5 de enero" })).toBeInTheDocument();
  });

  it("bloqueia data com programa com cue não-colorida e tooltip", async () => {
    const user = userEvent.setup();
    const { props } = renderCalendar();
    const programDay = screen.getByRole("button", { name: "14 de enero, con programa" });
    expect(programDay).toBeDisabled();
    expect(programDay).toHaveAttribute("aria-disabled", "true");
    expect(programDay).toHaveAttribute("title", es.tablaCreadaHint);
    await user.click(programDay);
    expect(props.onDateClick).not.toHaveBeenCalled();
  });

  it("chama onDateClick com a data ISO ao clicar em dia livre", async () => {
    const user = userEvent.setup();
    const { props } = renderCalendar();
    await user.click(screen.getByRole("button", { name: "7 de enero, seleccionado" }));
    expect(props.onDateClick).toHaveBeenCalledWith("2026-01-07");
  });

  it("aceita hint customizado para data com programa", () => {
    renderCalendar({ programDateHint: "Ya tiene tabla" });
    expect(screen.getByRole("button", { name: "14 de enero, con programa" })).toHaveAttribute(
      "title",
      "Ya tiene tabla",
    );
  });
});

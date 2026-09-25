// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  type DesignacoesCardDay,
  DesignacoesCards,
} from "@/features/designations/presentation/DesignacoesCards";

const DAY: DesignacoesCardDay = {
  date: "2026-09-24",
  kind: "midweek",
  time: "19:30",
  notice: null,
  cleaning: [
    {
      typeKey: "per_meeting",
      sectorKey: "auditorio",
      sectorName: "Auditório",
      personNames: ["Ana Paz", "Bob Lima"],
      isFamily: false,
    },
  ],
  duties: [
    {
      dutyKey: "sound",
      dutyName: "Sonido",
      postLabel: "Sonido",
      side: null,
      personName: "Ana Paz",
      sortOrder: 0,
    },
    {
      dutyKey: "platform",
      dutyName: "Plataforma",
      postLabel: "Plataforma",
      side: null,
      personName: "Carlos Ruiz",
      sortOrder: 1,
    },
  ],
};

describe("DesignacoesCards highlight", () => {
  it("destaca o nome próprio em designações e limpeza", () => {
    const { container } = render(<DesignacoesCards days={[DAY]} highlightName="Ana Paz" />);

    const pills = container.querySelectorAll("span.bg-accent");
    expect(pills).toHaveLength(2);
    for (const pill of Array.from(pills)) {
      expect(pill).toHaveTextContent("Ana Paz");
      expect(pill).toHaveClass("text-accent-ink");
    }
    // Nomes dos outros seguem neutros, sem pílula.
    expect(screen.getByTitle("Carlos Ruiz")).not.toHaveClass("bg-accent");
    expect(screen.getByTitle("Carlos Ruiz").querySelector("span.bg-accent")).toBeNull();
    const cleaningNames = screen.getByTitle("Ana Paz · Bob Lima");
    expect(cleaningNames.querySelectorAll("span.bg-accent")).toHaveLength(1);
  });

  it("compara sem diferenciar maiúsculas nem espaços", () => {
    const { container } = render(<DesignacoesCards days={[DAY]} highlightName="  ana PAZ " />);
    expect(container.querySelectorAll("span.bg-accent")).toHaveLength(2);
  });

  it("sem pessoa vinculada não destaca ninguém", () => {
    const { container } = render(<DesignacoesCards days={[DAY]} highlightName={null} />);
    expect(container.querySelectorAll("span.bg-accent")).toHaveLength(0);
    expect(screen.getAllByText("Ana Paz")).toHaveLength(2);
  });
});

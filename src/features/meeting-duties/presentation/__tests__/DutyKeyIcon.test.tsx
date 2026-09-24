// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DutyKeyIcon } from "@/features/meeting-duties/presentation/DutyKeyIcon";

describe("DutyKeyIcon", () => {
  it("renderiza o ícone conhecido como aria-hidden", () => {
    const { container } = render(<DutyKeyIcon dutyKey="microphone" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("fixa width e height em 18", () => {
    const { container } = render(<DutyKeyIcon dutyKey="sound" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "18");
    expect(svg).toHaveAttribute("height", "18");
  });

  it("usa o ícone genérico para chave desconhecida", () => {
    const { container } = render(<DutyKeyIcon dutyKey="setor-personalizado" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg?.className.baseVal ?? svg?.getAttribute("class") ?? "").toContain(
      "text-muted-foreground",
    );
  });

  it("combina className customizada com as classes base", () => {
    const { container } = render(<DutyKeyIcon dutyKey="usher" className="extra-classe" />);
    const svg = container.querySelector("svg");
    const classes = svg?.getAttribute("class") ?? "";
    expect(classes).toContain("shrink-0");
    expect(classes).toContain("text-muted-foreground");
    expect(classes).toContain("extra-classe");
  });
});

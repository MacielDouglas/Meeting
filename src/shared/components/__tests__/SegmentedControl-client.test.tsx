// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "@/shared/components/SegmentedControl-client";

const options = [
  { value: "name", label: "Alfabético" },
  { value: "rotation", label: "Rotación" },
];

describe("SegmentedControl", () => {
  it("marca a opção ativa com aria-pressed e nomeia o grupo", () => {
    render(
      <SegmentedControl
        options={options}
        value="name"
        onChange={() => {}}
        ariaLabel="Ordenar por"
      />,
    );

    expect(screen.getByRole("group", { name: "Ordenar por" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alfabético" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Rotación" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("chama onChange com o valor clicado", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        options={options}
        value="name"
        onChange={onChange}
        ariaLabel="Ordenar por"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Rotación" }));
    expect(onChange).toHaveBeenCalledWith("rotation");
  });

  it("desabilita os valores listados", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        options={options}
        value="name"
        onChange={onChange}
        ariaLabel="Ordenar por"
        disabledValues={["rotation"]}
      />,
    );

    const disabled = screen.getByRole("button", { name: "Rotación" });
    expect(disabled).toBeDisabled();
    await user.click(disabled);
    expect(onChange).not.toHaveBeenCalled();
  });
});

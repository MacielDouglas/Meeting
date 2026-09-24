// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Switch } from "@/shared/components/ui/switch";

function ControlledSwitch({ label }: { label: string }) {
  const [checked, setChecked] = useState(false);
  return <Switch label={label} checked={checked} onCheckedChange={setChecked} />;
}

describe("Switch", () => {
  it("alterna o estado e atualiza aria-checked", async () => {
    const user = userEvent.setup();
    render(<ControlledSwitch label="Notificaciones" />);
    const toggle = screen.getByRole("switch", { name: "Notificaciones" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("dispara onCheckedChange com o novo valor", async () => {
    const user = userEvent.setup();
    const seen: boolean[] = [];
    render(
      <Switch
        label="Modo oscuro"
        checked={false}
        onCheckedChange={(value) => {
          seen.push(value);
        }}
      />,
    );
    await user.click(screen.getByRole("switch", { name: "Modo oscuro" }));
    expect(seen).toEqual([true]);
  });

  it("fica inoperante quando disabled", () => {
    render(<Switch label="Fijo" checked={false} onCheckedChange={() => {}} disabled />);
    expect(screen.getByRole("switch", { name: "Fijo" })).toBeDisabled();
  });

  it("reflete checked controlado sem chamar onCheckedChange", async () => {
    const user = userEvent.setup();
    render(<Switch label="Fijo" checked onCheckedChange={() => {}} />);
    const toggle = screen.getByRole("switch", { name: "Fijo" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });
});

// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";

function OpenDialog({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        onOpenChange?.(value);
      }}
    >
      <DialogContent>
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
        <DialogClose>Fechar</DialogClose>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("abre com open e expõe role dialog com nome acessível", () => {
    render(<OpenDialog />);
    expect(screen.getByRole("dialog", { name: "Confirmar exclusão" })).toBeInTheDocument();
    expect(screen.getByText("Esta ação não pode ser desfeita.")).toBeInTheDocument();
  });

  it("não renderiza o conteúdo quando fechado", () => {
    render(
      <Dialog>
        <DialogContent>
          <DialogTitle>Confirmar exclusão</DialogTitle>
          <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByRole("dialog", { name: "Confirmar exclusão" })).not.toBeInTheDocument();
  });

  it("fecha via overlay chamando onOpenChange(false)", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onOpenChange = vi.fn();
    render(<OpenDialog onOpenChange={onOpenChange} />);
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).not.toBeNull();
    await user.click(overlay as HTMLElement);
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("fecha com Escape chamando onOpenChange(false)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<OpenDialog onOpenChange={onOpenChange} />);
    expect(screen.getByRole("dialog", { name: "Confirmar exclusão" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("DialogClose dispara o fechamento", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<OpenDialog onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});

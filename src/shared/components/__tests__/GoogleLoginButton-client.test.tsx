// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleLoginButton } from "@/shared/components/GoogleLoginButton-client";
import { es } from "@/shared/i18n/es";

const signInSocial = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/presentation/auth-client", () => ({
  authClient: { signIn: { social: signInSocial } },
}));

beforeEach(() => {
  signInSocial.mockReset();
});

describe("GoogleLoginButton", () => {
  it("mostra o botão idle com o texto de login", () => {
    render(<GoogleLoginButton />);
    const button = screen.getByRole("button", { name: es.signInWithGoogle });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("chama signIn.social com Google ao clicar", async () => {
    const user = userEvent.setup();
    signInSocial.mockReturnValue(new Promise(() => {}));
    render(<GoogleLoginButton />);
    await user.click(screen.getByRole("button", { name: es.signInWithGoogle }));
    expect(signInSocial).toHaveBeenCalledWith({ provider: "google", callbackURL: "/" });
  });

  it("mantém Cargando permanente quando resolve sem erro", async () => {
    const user = userEvent.setup();
    signInSocial.mockResolvedValue({});
    render(<GoogleLoginButton />);
    await user.click(screen.getByRole("button", { name: es.signInWithGoogle }));
    const loading = await screen.findByRole("button", { name: "Cargando…" });
    expect(loading).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: es.signInWithGoogle })).not.toBeInTheDocument();
  });

  it("mostra alerta quando resolve com erro", async () => {
    const user = userEvent.setup();
    signInSocial.mockResolvedValue({ error: { message: "oauth falhou" } });
    render(<GoogleLoginButton />);
    await user.click(screen.getByRole("button", { name: es.signInWithGoogle }));
    expect(await screen.findByRole("alert")).toHaveTextContent(es.errorLogin);
    expect(screen.getByRole("button", { name: es.signInWithGoogle })).toBeEnabled();
  });

  it("mostra alerta quando a promessa rejeita", async () => {
    const user = userEvent.setup();
    signInSocial.mockRejectedValue(new Error("rede caiu"));
    render(<GoogleLoginButton />);
    await user.click(screen.getByRole("button", { name: es.signInWithGoogle }));
    expect(await screen.findByRole("alert")).toHaveTextContent(es.errorLogin);
    expect(screen.getByRole("button", { name: es.signInWithGoogle })).toBeEnabled();
  });
});

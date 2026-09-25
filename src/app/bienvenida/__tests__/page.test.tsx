// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BienvenidaPage from "@/app/bienvenida/page";
import { getCurrentUser } from "@/features/auth/application/session";
import {
  getMyJoinToken,
  isUserAssociated,
} from "@/features/organization/application/organization-queries";
import { es } from "@/shared/i18n/es";

vi.mock("@/features/auth/application/session", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/features/organization/application/organization-queries", () => ({
  getMyJoinToken: vi.fn(),
  isUserAssociated: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

const newcomer = {
  id: "user-9",
  email: "nueva@example.com",
  name: "Nueva",
  role: "member" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(newcomer);
  vi.mocked(isUserAssociated).mockResolvedValue(false);
  vi.mocked(getMyJoinToken).mockResolvedValue(null);
});

describe("BienvenidaPage", () => {
  it("volta ao login sem sessão", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    await expect(BienvenidaPage()).rejects.toThrow("NEXT_REDIRECT:/sign-in");
  });

  it("manda o associado direto ao programa", async () => {
    vi.mocked(isUserAssociated).mockResolvedValue(true);
    await expect(BienvenidaPage()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(vi.mocked(getMyJoinToken)).not.toHaveBeenCalled();
  });

  it("dá boas-vindas com código, passos e prévia de exemplo", async () => {
    vi.mocked(getMyJoinToken).mockResolvedValue({
      code: "ABC-DEF-GHJ",
      expiresAt: "2026-10-02T00:00:00.000Z",
    });
    const html = renderToStaticMarkup(await BienvenidaPage());
    expect(html).toContain(es.bienvenida);
    expect(html).toContain(es.bienvenidaDesc);

    await act(async () => {
      render(await BienvenidaPage());
    });
    expect(await screen.findByText("ABC-DEF-GHJ")).toBeInTheDocument();
    expect(screen.getByText(es.comoFunciona)).toBeInTheDocument();
    expect(screen.getByText(es.pasoCodigo)).toBeInTheDocument();
    expect(screen.getByText(es.vistaPrevia)).toBeInTheDocument();
    expect(screen.getByText(es.ejemplo)).toBeInTheDocument();
    expect(screen.getByText("Hno. Ejemplo")).toBeInTheDocument();
  });
});

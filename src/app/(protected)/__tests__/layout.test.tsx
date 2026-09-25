// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProtectedLayout from "@/app/(protected)/layout";
import { getCurrentUser } from "@/features/auth/application/session";
import { isUserAssociated } from "@/features/organization/application/organization-queries";

vi.mock("@/features/auth/application/session", () => ({
  getCurrentUser: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  requirePrivilegedUser: vi.fn(),
  requireOwnerUser: vi.fn(),
}));
vi.mock("@/features/organization/application/organization-queries", () => ({
  isUserAssociated: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

const member = { id: "u2", email: "ana@example.com", name: "Ana", role: "member" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProtectedLayout", () => {
  it("volta ao login sem sessão", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    await expect(ProtectedLayout({ children: <p>filha</p> })).rejects.toThrow(
      "NEXT_REDIRECT:/sign-in",
    );
  });

  it("manda o membro sem associação às boas-vindas", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(member);
    vi.mocked(isUserAssociated).mockResolvedValue(false);
    await expect(ProtectedLayout({ children: <p>filha</p> })).rejects.toThrow(
      "NEXT_REDIRECT:/bienvenida",
    );
  });

  it("renderiza os filhos para o associado", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(member);
    vi.mocked(isUserAssociated).mockResolvedValue(true);
    render(await ProtectedLayout({ children: <p>filha</p> }));
    expect(screen.getByText("filha")).toBeInTheDocument();
    expect(vi.mocked(isUserAssociated)).toHaveBeenCalledWith(member);
  });
});

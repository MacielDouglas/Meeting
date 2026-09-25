// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PerfilPage from "@/app/(protected)/perfil/page";
import { getCurrentUser } from "@/features/auth/application/session";
import { getPersonByUserId } from "@/features/people/application/queries";
import { es } from "@/shared/i18n/es";

vi.mock("@/features/auth/application/session", () => ({
  getCurrentUser: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  requirePrivilegedUser: vi.fn(),
  requireOwnerUser: vi.fn(),
}));
vi.mock("@/features/people/application/queries", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/features/people/application/queries")>();
  return { ...original, getPersonByUserId: vi.fn() };
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

const member = { id: "u2", email: "ana@example.com", name: "Ana", role: "member" as const };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(member);
  vi.mocked(getPersonByUserId).mockResolvedValue({
    id: "p1",
    firstName: "Ana",
    lastName: "Paz",
    sex: "female" as const,
  });
});

describe("PerfilPage", () => {
  it("volta ao login sem sessão", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    await expect(PerfilPage()).rejects.toThrow("NEXT_REDIRECT:/sign-in");
  });

  it("mostra dados, persona vinculada e saída", async () => {
    await act(async () => {
      render(await PerfilPage());
    });
    expect(screen.getByRole("heading", { level: 1, name: es.perfil })).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByLabelText(es.firstName)).toHaveValue("Ana");
    expect(screen.getByRole("button", { name: es.salirOrganizacion })).toBeInTheDocument();
  });

  it("sem persona pede vínculo ao admin", async () => {
    vi.mocked(getPersonByUserId).mockResolvedValue(null);
    await act(async () => {
      render(await PerfilPage());
    });
    expect(screen.getByText(es.pideAdminVinculo, { exact: false })).toBeInTheDocument();
    expect(screen.queryByLabelText(es.firstName)).not.toBeInTheDocument();
  });

  it("owner não vê a saída", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "u1",
      email: "owner@example.com",
      name: "Owner",
      role: "owner" as const,
    });
    await act(async () => {
      render(await PerfilPage());
    });
    expect(screen.queryByRole("button", { name: es.salirOrganizacion })).not.toBeInTheDocument();
  });
});

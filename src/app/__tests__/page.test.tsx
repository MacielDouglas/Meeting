// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import { getCurrentUser } from "@/features/auth/application/session";
import { getMyWeek } from "@/features/weekly-schedule/application/get-my-week";
import { getWeeklySchedule } from "@/features/weekly-schedule/application/get-weekly-schedule";
import type { MyWeek } from "@/features/weekly-schedule/domain/my-week";
import type { WeeklySchedule } from "@/features/weekly-schedule/domain/schedule";
import { es } from "@/shared/i18n/es";

const cacheWriter = vi.hoisted(() => vi.fn(() => null));

vi.mock("@/features/auth/application/session", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/features/weekly-schedule/application/get-weekly-schedule", () => ({
  getWeeklySchedule: vi.fn(),
}));
vi.mock("@/features/weekly-schedule/application/get-my-week", () => ({
  getMyWeek: vi.fn(),
}));
vi.mock("@/features/offline/ScheduleCacheWriter", () => ({
  ScheduleCacheWriter: cacheWriter,
}));

const scheduleFixture: WeeklySchedule = {
  weekStart: "2026-09-21",
  weekEnd: "2026-09-27",
  midweek: {
    id: "midweek-2026-09-21",
    kind: "midweek",
    date: "2026-09-23",
    time: "19:30",
    location: "Salón del Reino",
    theme: "Reunión entre semana",
    parts: [],
  },
  weekend: {
    id: "weekend-2026-09-27",
    kind: "weekend",
    date: "2026-09-27",
    time: "10:00",
    location: "Salón del Reino",
    theme: "Reunión de fin de semana",
    parts: [],
  },
};

const myWeekFixture: MyWeek = {
  weekStart: "2026-09-21",
  weekEnd: "2026-09-27",
  personName: "Antonio Pedro",
  isMale: true,
  meetings: [
    {
      kind: "midweek",
      title: "Reunión entre semana",
      date: "2026-09-23",
      time: "19:30",
      location: "Salón del Reino",
      isNext: true,
      parts: [
        {
          partKey: "ministry-0",
          section: "SEAMOS MEJORES MAESTROS",
          title: "Haga revisitas",
          durationMinutes: 4,
          songNumber: null,
          isHelper: false,
          personName: "Antonio Pedro",
          helperPersonName: "",
        },
      ],
      cleaning: [{ assignmentDate: "2026-09-23", sectorName: "Auditorio", isFamily: false }],
      duties: [],
    },
    {
      kind: "weekend",
      title: "Reunión de fin de semana",
      date: "2026-09-27",
      time: "10:00",
      location: "Salón del Reino",
      isNext: false,
      parts: [],
      cleaning: [],
      duties: [],
    },
  ],
  upcomingDuties: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(null);
  vi.mocked(getWeeklySchedule).mockImplementation(() =>
    Promise.reject(new Error("getWeeklySchedule não deveria ser chamado")),
  );
  vi.mocked(getMyWeek).mockImplementation(() =>
    Promise.reject(new Error("getMyWeek não deveria ser chamado")),
  );
});

describe("HomePage — landing pública", () => {
  it("renderiza marca, tagline, destaques e login sem buscar dados de sessão", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("Meeting");
    expect(html).toContain(es.homeTagline);
    expect(html).toContain(es.homeFeatPrograma);
    expect(html).toContain(es.homeFeatDesignaciones);
    expect(html).toContain(es.homeFeatOffline);
    expect(html).toContain(es.signInWithGoogle);

    expect(vi.mocked(getWeeklySchedule)).not.toHaveBeenCalled();
    expect(vi.mocked(getMyWeek)).not.toHaveBeenCalled();
    expect(cacheWriter).not.toHaveBeenCalled();
  });

  it("expõe o botão de Google e exatamente três destaques", async () => {
    render(await HomePage());

    expect(screen.getByRole("heading", { level: 1, name: "Meeting" })).toBeInTheDocument();
    expect(screen.getByText(es.homeTagline)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("button", { name: es.signInWithGoogle })).toBeInTheDocument();
    expect(screen.queryByText(es.miSemana)).not.toBeInTheDocument();
  });
});

describe("HomePage — autenticado", () => {
  it("renderiza Mi semana com a semana e as designações da pessoa", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      email: "ana@example.com",
      name: "Ana",
      role: "member",
    });
    vi.mocked(getWeeklySchedule).mockResolvedValue(scheduleFixture);
    vi.mocked(getMyWeek).mockResolvedValue(myWeekFixture);

    await act(async () => {
      render(await HomePage());
    });

    expect(await screen.findByRole("heading", { level: 1, name: es.miSemana })).toBeInTheDocument();
    expect(screen.getByText(es.eres)).toBeInTheDocument();
    expect(screen.getByText("Antonio Pedro")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: es.verProgramaCompleto })).toBeInTheDocument();
    expect(screen.queryByText(es.homeTagline)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: es.signInWithGoogle })).not.toBeInTheDocument();

    expect(vi.mocked(getWeeklySchedule)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getMyWeek)).toHaveBeenCalledWith("user-1");
    expect(cacheWriter).toHaveBeenCalled();
  });
});

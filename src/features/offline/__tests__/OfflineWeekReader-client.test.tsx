// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OfflineWeekReader } from "@/features/offline/OfflineWeekReader-client";
import type { OfflineSyncPayload } from "@/features/offline/offline-sync-actions";
import { readAllOfflineSyncs } from "@/features/offline/schedule-cache";
import { es } from "@/shared/i18n/es";

vi.mock("@/features/offline/schedule-cache", () => ({
  readAllOfflineSyncs: vi.fn(),
  writeOfflineSync: vi.fn(),
  readOfflineSync: vi.fn(),
  purgeOtherOwners: vi.fn(),
  clearAllOfflineData: vi.fn(),
  readCachedSchedule: vi.fn(),
  writeCachedSchedule: vi.fn(),
}));

function payload(): OfflineSyncPayload {
  const week = {
    weekStart: "2026-09-21",
    weekEnd: "2026-09-27",
    schedule: {
      weekStart: "2026-09-21",
      weekEnd: "2026-09-27",
      midweek: {
        id: "midweek-2026-09-21",
        kind: "midweek" as const,
        date: "2026-09-24",
        time: "19:30",
        location: "Salón del Reino",
        theme: "Reunión entre semana",
        parts: [],
      },
      weekend: {
        id: "weekend-2026-09-27",
        kind: "weekend" as const,
        date: "2026-09-27",
        time: "10:00",
        location: "Salón del Reino",
        theme: "Reunión de fin de semana",
        parts: [],
      },
    },
    midweek: {
      program: {
        id: "prog-1",
        kind: "midweek" as const,
        weekStart: "2026-09-21",
        date: "2026-09-24",
        outlineId: null,
        status: "draft" as const,
        exceptionType: "",
        exceptionLabel: "",
        assignmentCount: 1,
      },
      assignments: [
        {
          id: "asg-1",
          programId: "prog-1",
          partKey: "treasures-talk",
          section: "TESOROS DE LA BIBLIA",
          title: "Jehová disciplina",
          subtitle: "",
          startTime: "19:06",
          durationMinutes: 10,
          personId: "p1",
          personName: "Juan Pérez",
          helperPersonId: null,
          helperPersonName: "",
          songNumber: null,
          songTheme: "",
          classroom: "A",
          study: "",
          source: "",
          notes: "",
          speakerCongregation: "",
          sortOrder: 0,
        },
      ],
    },
    weekend: null,
    cleaning: [],
    duties: [],
  };
  return {
    ownerKey: "u1",
    savedAt: new Date().toISOString(),
    congregationName: "Norte",
    personName: "Juan Pérez",
    weeks: [week, { ...week, weekStart: "2026-09-28", weekEnd: "2026-10-04" }],
    upcomingDuties: [],
    songs: [],
    outlines: [],
    workbookWeeks: [],
    watchtowerIssues: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OfflineWeekReader", () => {
  it("mostra as semanas guardadas com partes e designados", async () => {
    vi.mocked(readAllOfflineSyncs).mockResolvedValue([payload()]);
    render(<OfflineWeekReader />);

    expect(await screen.findByText(es.offlineGuardado)).toBeInTheDocument();
    // As 2 semanas usam a mesma parte no fixture.
    expect(screen.getAllByText(/Jehová disciplina/).length).toBe(2);
    expect(screen.getAllByText("Juan Pérez").length).toBeGreaterThanOrEqual(2);
  });

  it("não mostra nada sem pacote guardado", async () => {
    vi.mocked(readAllOfflineSyncs).mockResolvedValue([]);
    const { container } = render(<OfflineWeekReader />);

    await waitFor(() => expect(vi.mocked(readAllOfflineSyncs)).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

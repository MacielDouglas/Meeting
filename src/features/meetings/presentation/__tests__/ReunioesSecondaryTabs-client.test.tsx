// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ContentCounts, SongItem } from "@/features/meeting-content/application/queries";
import type { WatchtowerIssueItem } from "@/features/meeting-content/application/watchtower-queries";
import type { WorkbookIssueItem } from "@/features/meeting-content/application/workbook-queries";
import type { OutsideSpeakerItem } from "@/features/meetings/application/outside-speaker-queries";
import { ReunioesSecondaryTabs } from "@/features/meetings/presentation/ReunioesSecondaryTabs-client";

vi.mock("@/features/meeting-content/presentation/ContentSection", () => ({
  ContentSection: ({
    initialSongs,
    counts,
  }: {
    initialSongs: SongItem[];
    counts: ContentCounts;
  }) => (
    <p data-testid="content-section">
      {initialSongs.length} cánticos · {counts.songsEs} ES
    </p>
  ),
}));

vi.mock("@/features/meetings/presentation/OutsideSpeakers-client", () => ({
  OutsideSpeakersClient: ({
    initialSpeakers,
    systemCongregation,
  }: {
    initialSpeakers: OutsideSpeakerItem[];
    systemCongregation: string;
  }) => (
    <p data-testid="speakers-section">
      {initialSpeakers.length} oradores · {systemCongregation}
    </p>
  ),
}));

const defaultProps: ComponentProps<typeof ReunioesSecondaryTabs> = {
  tab: "conteudo",
  songs: [{ id: "s1", number: 1, theme: "Cielos declaran", language: "es" }],
  outlines: [{ id: "o1", number: 1, theme: "Discurso modelo", language: "es" }],
  issues: [] as WatchtowerIssueItem[],
  workbooks: [] as WorkbookIssueItem[],
  counts: {
    songsEs: 1,
    songsPt: 0,
    songsEn: 0,
    outlinesEs: 1,
    outlinesPt: 0,
    outlinesEn: 0,
  },
  speakers: [
    {
      id: "sp1",
      name: "Juan Pérez",
      congregation: "Sur",
      talkNumber: 1,
      talkTheme: "Tema",
      phone: "",
      notes: "",
      talks: [],
    },
  ],
  systemCongregation: "Central",
  canManage: false,
};

function renderTabs(overrides: Partial<ComponentProps<typeof ReunioesSecondaryTabs>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const props = { ...defaultProps, ...overrides };
  render(
    <QueryClientProvider client={queryClient}>
      <ReunioesSecondaryTabs {...props} />
    </QueryClientProvider>,
  );
}

describe("ReunioesSecondaryTabs", () => {
  it("con tab Contenido monta la sección de contenido con los datos iniciales", async () => {
    renderTabs({ tab: "conteudo" });

    const section = await screen.findByTestId("content-section");
    expect(section).toHaveTextContent("1 cánticos · 1 ES");
    expect(screen.queryByTestId("speakers-section")).not.toBeInTheDocument();
  });

  it("con tab Oradores monta la sección de oradores de fuera", async () => {
    renderTabs({ tab: "oradores" });

    const section = await screen.findByTestId("speakers-section");
    expect(section).toHaveTextContent("1 oradores · Central");
    expect(screen.queryByTestId("content-section")).not.toBeInTheDocument();
  });
});

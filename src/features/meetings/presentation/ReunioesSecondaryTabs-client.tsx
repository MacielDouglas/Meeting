"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import type {
  ContentCounts,
  OutlineItem,
  SongItem,
} from "@/features/meeting-content/application/queries";
import type { WatchtowerIssueItem } from "@/features/meeting-content/application/watchtower-queries";
import type { WorkbookIssueItem } from "@/features/meeting-content/application/workbook-queries";
import type { OutsideSpeakerItem } from "@/features/meetings/application/outside-speaker-queries";
import { CardSkeleton, TableSkeleton } from "@/shared/components/skeletons";

// Abas secundárias em chunks sob demanda: a rota abre só com o programa.
// `ssr: false` exige ilha client; os dados continuam buscados no server.
const ContentSection = dynamic(
  () =>
    import("@/features/meeting-content/presentation/ContentSection").then(
      (module) => module.ContentSection,
    ),
  { ssr: false },
);
const OutsideSpeakersClient = dynamic(
  () =>
    import("@/features/meetings/presentation/OutsideSpeakers-client").then(
      (module) => module.OutsideSpeakersClient,
    ),
  { ssr: false },
);

interface ReunioesSecondaryTabsProps {
  tab: "conteudo" | "oradores";
  songs: SongItem[];
  outlines: OutlineItem[];
  issues: WatchtowerIssueItem[];
  workbooks: WorkbookIssueItem[];
  counts: ContentCounts;
  speakers: OutsideSpeakerItem[];
  systemCongregation: string;
  canManage: boolean;
}

export function ReunioesSecondaryTabs({
  tab,
  songs,
  outlines,
  issues,
  workbooks,
  counts,
  speakers,
  systemCongregation,
  canManage,
}: ReunioesSecondaryTabsProps) {
  if (tab === "oradores") {
    return (
      <Suspense fallback={<CardSkeleton />}>
        <OutsideSpeakersClient
          initialSpeakers={speakers}
          initialOutlines={outlines.map((o) => ({ number: o.number, theme: o.theme }))}
          systemCongregation={systemCongregation}
          canManage={canManage}
        />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <ContentSection
        initialSongs={songs}
        initialOutlines={outlines}
        initialIssues={issues}
        initialWorkbooks={workbooks}
        counts={counts}
        canManage={canManage}
      />
    </Suspense>
  );
}

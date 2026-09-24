import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import {
  getContentCounts,
  listOutlines,
  listSongs,
} from "@/features/meeting-content/application/queries";
import { listWatchtowerIssues } from "@/features/meeting-content/application/watchtower-queries";
import { listWorkbookIssues } from "@/features/meeting-content/application/workbook-queries";
import { listOutsideSpeakers } from "@/features/meetings/application/outside-speaker-queries";
import { MeetingProgramSection } from "@/features/meetings/presentation/MeetingProgramSection";
import { ReunioesSecondaryTabs } from "@/features/meetings/presentation/ReunioesSecondaryTabs-client";
import {
  getMeetingSchedule,
  listPublicSpecialEvents,
} from "@/features/settings/application/queries";
import { getWeeklySchedule } from "@/features/weekly-schedule/application/get-weekly-schedule";
import { selectInitialKind } from "@/features/weekly-schedule/domain/schedule";
import { PageHeader } from "@/shared/components/PageHeader";
import { CardSkeleton } from "@/shared/components/skeletons";
import { TabNav } from "@/shared/components/TabNav-client";
import { es } from "@/shared/i18n/es";
import { todayLocalISO } from "@/shared/lib/format-date";

type ReunioesTab = "reunioes" | "conteudo" | "oradores";

const TABS: { value: ReunioesTab; label: string }[] = [
  { value: "reunioes", label: es.tabReuniones },
  { value: "conteudo", label: es.tabContenido },
  { value: "oradores", label: es.tabOradores },
];

const ZERO_COUNTS = {
  songsEs: 0,
  songsPt: 0,
  songsEn: 0,
  outlinesEs: 0,
  outlinesPt: 0,
  outlinesEn: 0,
};

/** Aba Reuniões: dados próprios sob Suspense — o shell nunca espera. */
async function MeetingsTab({ canManage }: { canManage: boolean }) {
  const [schedule, songs, outlines, issues, workbooks, meetingScheduleData, events] =
    await Promise.all([
      getWeeklySchedule(),
      listSongs(),
      listOutlines(),
      listWatchtowerIssues(),
      listWorkbookIssues(),
      getMeetingSchedule(),
      listPublicSpecialEvents(),
    ]);

  return (
    <MeetingProgramSection
      songs={songs.map((s) => ({ number: s.number, theme: s.theme }))}
      outlines={outlines.map((o) => ({
        id: o.id,
        number: o.number,
        theme: o.theme,
        language: o.language,
      }))}
      workbooks={workbooks.flatMap((w) =>
        w.weeks.map((week) => ({
          label: `${w.name} — ${week.week}`,
          meeting: week.meeting,
          weekStart: week.weekStart ?? null,
        })),
      )}
      articles={issues.flatMap((issue) =>
        issue.articles.map((a) => ({
          id: a.id,
          label: a.weekLabel,
          title: a.title,
          openingSong: a.openingSong,
          closingSong: a.closingSong,
          weekStart: a.weekStart,
          weekEnd: a.weekEnd,
        })),
      )}
      midweekTime={meetingScheduleData.midweekTime}
      weekendTime={meetingScheduleData.weekendTime}
      midweekDay={meetingScheduleData.midweekDay}
      weekendDay={meetingScheduleData.weekendDay}
      canManage={canManage}
      initialWeekStart={schedule.weekStart}
      initialKind={selectInitialKind(todayLocalISO(), schedule.midweek.date)}
      congregationName={meetingScheduleData.congregationName}
      events={events}
    />
  );
}

/** Abas Conteúdo/Oradores: fetch condicional ao tab, sob Suspense. */
async function SecondaryTab({
  tab,
  canManage,
}: {
  tab: "conteudo" | "oradores";
  canManage: boolean;
}) {
  const isContent = tab === "conteudo";
  const [songs, outlines, counts, issues, workbooks, meetingScheduleData, speakers] =
    await Promise.all([
      isContent ? listSongs() : Promise.resolve([]),
      listOutlines(),
      isContent ? getContentCounts() : Promise.resolve(ZERO_COUNTS),
      isContent ? listWatchtowerIssues() : Promise.resolve([]),
      isContent ? listWorkbookIssues() : Promise.resolve([]),
      getMeetingSchedule(),
      tab === "oradores" ? listOutsideSpeakers() : Promise.resolve([]),
    ]);

  return (
    <ReunioesSecondaryTabs
      tab={tab}
      songs={songs}
      outlines={outlines}
      issues={issues}
      workbooks={workbooks}
      counts={counts}
      speakers={speakers}
      systemCongregation={meetingScheduleData.congregationName}
      canManage={canManage}
    />
  );
}

export default async function ReunioesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const params = (await searchParams) ?? {};
  if (params.tab === "designacoes") redirect("/designacoes");
  if (
    (params.tab === "conteudo" || params.tab === "oradores") &&
    user.role !== "owner" &&
    user.role !== "admin"
  ) {
    redirect("/reunioes");
  }
  const tab: ReunioesTab =
    params.tab === "conteudo" || params.tab === "oradores" ? params.tab : "reunioes";
  const canManage = user.role === "owner" || user.role === "admin";

  return (
    <main className="page-stack">
      <PageHeader title={es.tabReuniones} />

      {canManage && (
        <TabNav
          param="tab"
          defaultValue="reunioes"
          ariaLabel={es.seccionesReuniones}
          items={TABS.map((item) => ({
            value: item.value,
            label: item.label,
            href: `/reunioes?tab=${item.value}`,
          }))}
        />
      )}

      {tab === "reunioes" && (
        <Suspense fallback={<CardSkeleton />}>
          <MeetingsTab canManage={canManage} />
        </Suspense>
      )}

      {tab !== "reunioes" && (
        <Suspense fallback={<CardSkeleton />}>
          <SecondaryTab tab={tab} canManage={canManage} />
        </Suspense>
      )}
    </main>
  );
}

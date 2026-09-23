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
import { getMeetingSchedule } from "@/features/settings/application/queries";
import { getWeeklySchedule } from "@/features/weekly-schedule/application/get-weekly-schedule";
import { selectInitialKind } from "@/features/weekly-schedule/domain/schedule";
import { PageHeader } from "@/shared/components/PageHeader";
import { CardSkeleton, TabNavSkeleton } from "@/shared/components/skeletons";
import { TabNav } from "@/shared/components/TabNav-client";
import { es } from "@/shared/i18n/es";
import { formatDateBR, todayLocalISO } from "@/shared/lib/format-date";

type ReunioesTab = "reunioes" | "conteudo" | "oradores";

const TABS: { value: ReunioesTab; label: string }[] = [
  { value: "reunioes", label: es.tabReuniones },
  { value: "conteudo", label: es.tabContenido },
  { value: "oradores", label: es.tabOradores },
];

export default async function ReunioesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; reuniao?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const params = (await searchParams) ?? {};
  if (params.tab === "designacoes") redirect("/designacoes");
  if (
    (params.tab === "conteudo" || params.tab === "oradores") &&
    user?.role !== "owner" &&
    user?.role !== "admin"
  ) {
    redirect("/reunioes");
  }
  const tab: ReunioesTab =
    params.tab === "conteudo" || params.tab === "oradores" ? params.tab : "reunioes";
  const canManage = user?.role === "owner" || user?.role === "admin";
  const needsMeetings = tab === "reunioes" || tab === "conteudo";
  const needsOutlines = needsMeetings || tab === "oradores";
  const [schedule, songs, outlines, counts, issues, workbooks, meetingScheduleData, speakers] =
    await Promise.all([
      getWeeklySchedule(),
      needsMeetings ? listSongs() : Promise.resolve([]),
      needsOutlines ? listOutlines() : Promise.resolve([]),
      tab === "conteudo"
        ? getContentCounts()
        : Promise.resolve({
            songsEs: 0,
            songsPt: 0,
            songsEn: 0,
            outlinesEs: 0,
            outlinesPt: 0,
            outlinesEn: 0,
          }),
      needsMeetings ? listWatchtowerIssues() : Promise.resolve([]),
      needsMeetings ? listWorkbookIssues() : Promise.resolve([]),
      needsMeetings || tab === "oradores"
        ? getMeetingSchedule()
        : Promise.resolve({
            congregationName: "",
            midweekDay: 2 as const,
            midweekTime: "19:30",
            weekendDay: 0 as const,
            weekendTime: "10:00",
          }),
      tab === "oradores" ? listOutsideSpeakers() : Promise.resolve([]),
    ]);

  return (
    <main className="page-stack">
      <PageHeader
        title={es.tabReuniones}
        meta={`${formatDateBR(schedule.weekStart)} — ${formatDateBR(schedule.weekEnd)}`}
      />

      {canManage && (
        <Suspense fallback={<TabNavSkeleton tabs={3} />}>
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
        </Suspense>
      )}

      {tab === "reunioes" && (
        <Suspense fallback={<CardSkeleton />}>
          <MeetingProgramSection
            songs={songs.map((s) => ({ number: s.number, theme: s.theme }))}
            outlines={outlines.map((o) => ({
              id: o.id,
              number: o.number,
              theme: o.theme,
              language: o.language,
            }))}
            workbooks={
              workbooks.map((w) => ({
                label: w.weeks[0]?.week ?? w.name,
                meeting: w.weeks[0]?.meeting ?? { song: [] },
              })).length > 0
                ? workbooks.flatMap((w) =>
                    w.weeks.map((week) => ({
                      label: `${w.name} — ${week.week}`,
                      meeting: week.meeting,
                      weekStart: week.weekStart ?? null,
                    })),
                  )
                : []
            }
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
          />
        </Suspense>
      )}

      {tab !== "reunioes" && (
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
      )}
    </main>
  );
}

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
import { ContentSection } from "@/features/meeting-content/presentation/ContentSection";
import { listOutsideSpeakers } from "@/features/meetings/application/outside-speaker-queries";
import { MeetingProgramSection } from "@/features/meetings/presentation/MeetingProgramSection";
import { OutsideSpeakersClient } from "@/features/meetings/presentation/OutsideSpeakers-client";
import { getMeetingSchedule } from "@/features/settings/application/queries";
import { getWeeklySchedule } from "@/features/weekly-schedule/application/get-weekly-schedule";
import { selectInitialKind } from "@/features/weekly-schedule/domain/schedule";
import { PageHeader } from "@/shared/components/PageHeader";
import { CardSkeleton, TableSkeleton } from "@/shared/components/skeletons";
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
  const tab: ReunioesTab =
    params.tab === "conteudo" || params.tab === "oradores" ? params.tab : "reunioes";
  const canManage = user.role === "owner" || user.role === "admin";
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
    <main className="flex flex-col gap-4 pb-28">
      <PageHeader
        title={es.tabReuniones}
        meta={`${formatDateBR(schedule.weekStart)} — ${formatDateBR(schedule.weekEnd)}`}
      />

      <Suspense
        fallback={
          <div className="flex gap-2" aria-hidden>
            <div className="h-9 flex-1 animate-pulse rounded-full bg-secondary" />
            <div className="h-9 flex-1 animate-pulse rounded-full bg-secondary" />
            <div className="h-9 flex-1 animate-pulse rounded-full bg-secondary" />
          </div>
        }
      >
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

      {tab === "reunioes" && (
        <Suspense fallback={<CardSkeleton />}>
          <MeetingProgramSection
            songs={songs.map((s) => ({ number: s.number, theme: s.theme }))}
            outlines={outlines.map((o) => ({ id: o.id, number: o.number, theme: o.theme }))}
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

      {tab === "oradores" && (
        <Suspense fallback={<CardSkeleton />}>
          <OutsideSpeakersClient
            initialSpeakers={speakers}
            initialOutlines={outlines.map((o) => ({ number: o.number, theme: o.theme }))}
            systemCongregation={meetingScheduleData.congregationName}
            canManage={canManage}
          />
        </Suspense>
      )}

      {tab === "conteudo" && (
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
      )}
    </main>
  );
}

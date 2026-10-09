import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import { listOutlines, listSongs } from "@/features/meeting-content/application/queries";
import { listWatchtowerIssues } from "@/features/meeting-content/application/watchtower-queries";
import { listWorkbookIssues } from "@/features/meeting-content/application/workbook-queries";
import { MeetingProgramSection } from "@/features/meetings/presentation/MeetingProgramSection";
import { ReunioesEditModeToggle } from "@/features/meetings/presentation/ReunioesEditMode-client";
import {
  getMeetingSchedule,
  listPublicSpecialEvents,
} from "@/features/settings/application/queries";
import { getWeeklySchedule } from "@/features/weekly-schedule/application/get-weekly-schedule";
import { selectInitialKind } from "@/features/weekly-schedule/domain/schedule";
import { PageHeader } from "@/shared/components/PageHeader";
import { CardSkeleton } from "@/shared/components/skeletons";
import { es } from "@/shared/i18n/es";
import { todayLocalISO } from "@/shared/lib/format-date";

export const metadata: Metadata = { title: es.tabReuniones };

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

export default async function ReunioesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const params = (await searchParams) ?? {};
  if (params.tab === "designacoes") redirect("/designacoes");
  // Rotas antigas: conteúdo foi para a administração; oradores para a aba em personas.
  if (params.tab === "conteudo") redirect("/administracion/contenido");
  if (params.tab === "oradores") redirect("/administracion/personas?tab=oradores");
  const canManage = user.role === "owner" || user.role === "admin";

  return (
    <main className="page-stack">
      <PageHeader
        title={es.tabReuniones}
        actions={canManage ? <ReunioesEditModeToggle /> : undefined}
      />

      <Suspense fallback={<CardSkeleton />}>
        <MeetingsTab canManage={canManage} />
      </Suspense>
    </main>
  );
}

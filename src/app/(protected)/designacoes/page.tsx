import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import {
  listCleaningAssignmentsForDates,
  listUpcomingCleaningDates,
} from "@/features/cleaning/application/cleaning-program-queries";
import {
  type DesignacoesCardDay,
  DesignacoesCards,
} from "@/features/designations/presentation/DesignacoesCards";
import {
  listDutyAssignmentsForDates,
  listUpcomingDutyDates,
} from "@/features/meeting-duties/application/duty-queries";
import { getMeetingSchedule } from "@/features/settings/application/queries";
import { PageHeader } from "@/shared/components/PageHeader";
import { WeekCardsSkeleton } from "@/shared/components/skeletons";
import { Card } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";
import { todayLocalISO } from "@/shared/lib/format-date";

const UPCOMING_COUNT = 4;
const MAX_CARDS = 6;

interface UpcomingMeeting {
  date: string;
  kind: "midweek" | "weekend";
  time: string;
}

/** Próximas datas de reunião (hoje incluído) a partir dos dias configurados. */
function nextMeetingDates(
  midweekDay: number,
  weekendDay: number,
  midweekTime: string,
  weekendTime: string,
  todayISO: string,
  count: number,
): UpcomingMeeting[] {
  const toDays = (iso: string): number => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d) / 86400000;
  };
  const fromDays = (days: number): string => new Date(days * 86400000).toISOString().slice(0, 10);
  const weekdayOf = (iso: string): number => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  };
  const meetings: UpcomingMeeting[] = [];
  let cursor = toDays(todayISO);
  let guard = 0;
  while (meetings.length < count && guard < 60) {
    guard += 1;
    const iso = fromDays(cursor);
    const weekday = weekdayOf(iso);
    if (weekday === midweekDay) {
      meetings.push({ date: iso, kind: "midweek", time: midweekTime });
    } else if (weekday === weekendDay) {
      meetings.push({ date: iso, kind: "weekend", time: weekendTime });
    }
    cursor += 1;
  }
  return meetings;
}

export default async function DesignacoesPage({
  searchParams,
}: {
  searchParams?: Promise<{ secao?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const params = (await searchParams) ?? {};
  // Gestão mudou para /asignar; links antigos com ?secao= acompanham.
  if (params.secao === "limpeza" || params.secao === "reuniao") {
    redirect(`/asignar?secao=${params.secao}`);
  }

  const canManage = user.role === "owner" || user.role === "admin";

  return (
    <main className="page-stack">
      <PageHeader
        title={es.tabDesignaciones}
        actions={
          canManage ? (
            <Link
              href="/asignar"
              className="flex h-11 items-center rounded-xl bg-accent px-4 font-display text-sm font-medium text-accent-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {es.asignar}
            </Link>
          ) : undefined
        }
      />

      <Suspense fallback={<WeekCardsSkeleton />}>
        <DesignacoesCardsSection canManage={canManage} />
      </Suspense>
    </main>
  );
}

/** Busca blocante isolada: o shell (header) nunca espera os dados. */
async function DesignacoesCardsSection({ canManage }: { canManage: boolean }) {
  const meetingSchedule = await getMeetingSchedule();
  const today = todayLocalISO();
  const scheduled = nextMeetingDates(
    meetingSchedule.midweekDay,
    meetingSchedule.weekendDay,
    meetingSchedule.midweekTime,
    meetingSchedule.weekendTime,
    today,
    UPCOMING_COUNT,
  );

  // Une as datas da agenda com as datas que têm designação salva (limpeza
  // semanal/geral e escalas podem cair fora dos dias de reunião).
  const [cleaningDates, dutyDates] = await Promise.all([
    listUpcomingCleaningDates(today),
    listUpcomingDutyDates(today),
  ]);
  const byDate = new Map<string, UpcomingMeeting>();
  for (const meeting of scheduled) byDate.set(meeting.date, meeting);
  for (const date of [...cleaningDates, ...dutyDates]) {
    if (byDate.has(date)) continue;
    const [y, m, d] = date.split("-").map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const kind =
      weekday === meetingSchedule.midweekDay
        ? "midweek"
        : weekday === meetingSchedule.weekendDay
          ? "weekend"
          : weekday === 0 || weekday === 6
            ? "weekend"
            : "midweek";
    byDate.set(date, {
      date,
      kind,
      time: kind === "midweek" ? meetingSchedule.midweekTime : meetingSchedule.weekendTime,
    });
  }
  const upcoming = [...byDate.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(0, MAX_CARDS);

  const dates = upcoming.map((meeting) => meeting.date);
  const [cleaning, duties] = await Promise.all([
    listCleaningAssignmentsForDates(dates),
    listDutyAssignmentsForDates(dates),
  ]);

  const days: DesignacoesCardDay[] = upcoming.map((meeting) => {
    // Prefere programas ativos; sem eles, usa o arquivado (não esconde
    // designações salvas).
    const dayCleaning = cleaning.filter((assignment) => assignment.assignmentDate === meeting.date);
    const activeCleaning = dayCleaning.filter((assignment) => assignment.status !== "archived");
    const effectiveCleaning = activeCleaning.length > 0 ? activeCleaning : dayCleaning;
    const dayDuties = duties.filter((assignment) => assignment.assignmentDate === meeting.date);
    const activeDuties = dayDuties.filter((assignment) => assignment.status !== "archived");
    const effectiveDuties = activeDuties.length > 0 ? activeDuties : dayDuties;
    const cleaningBySector = new Map<string, DesignacoesCardDay["cleaning"][number]>();
    for (const assignment of effectiveCleaning) {
      const group = cleaningBySector.get(assignment.sectorKey) ?? {
        typeKey: assignment.typeKey,
        sectorKey: assignment.sectorKey,
        sectorName: assignment.sectorName,
        personNames: [],
        isFamily: false,
      };
      group.personNames.push(assignment.personName || es.sinAsignar);
      if (assignment.isFamily) group.isFamily = true;
      cleaningBySector.set(assignment.sectorKey, group);
    }
    return {
      date: meeting.date,
      kind: meeting.kind,
      time: meeting.time,
      cleaning: [...cleaningBySector.values()],
      duties: effectiveDuties.map((assignment) => ({
        dutyKey: assignment.dutyKey,
        dutyName: assignment.dutyName,
        postLabel: assignment.postLabel,
        side: assignment.side,
        personName: assignment.personName,
        sortOrder: assignment.sortOrder,
      })),
    };
  });

  return (
    <>
      <DesignacoesCards days={days} />
      {days.length === 0 ? (
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-sm text-muted-foreground">{es.sinDesignacionesProxima}</p>
          {canManage ? (
            <div>
              <Link
                href="/asignar"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 font-display text-sm font-medium text-accent-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {es.asignar}
              </Link>
            </div>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}

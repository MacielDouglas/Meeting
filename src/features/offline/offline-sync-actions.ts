"use server";

import { requireAuthenticatedUser } from "@/features/auth/application/session";
import {
  listPersonCleaningInRange,
  type PersonCleaningItem,
} from "@/features/cleaning/application/cleaning-program-queries";
import { listOutlines, listSongs } from "@/features/meeting-content/application/queries";
import {
  listWatchtowerIssues,
  type WatchtowerIssueItem,
} from "@/features/meeting-content/application/watchtower-queries";
import { listWorkbookIssues } from "@/features/meeting-content/application/workbook-queries";
import type { WorkbookContentWeek } from "@/features/meeting-content/infrastructure/workbook-parser";
import {
  listPersonDutiesInRange,
  listUpcomingPersonDuties,
  type PersonDutyItem,
} from "@/features/meeting-duties/application/duty-queries";
import {
  getMeetingProgram,
  type MeetingAssignmentItem,
  type MeetingProgramItem,
} from "@/features/meetings/application/meeting-queries";
import { getPersonByUserId } from "@/features/people/application/queries";
import { getMeetingSchedule } from "@/features/settings/application/queries";
import { getWeeklySchedule } from "@/features/weekly-schedule/application/get-weekly-schedule";
import { getWeekRange, type WeeklySchedule } from "@/features/weekly-schedule/domain/schedule";
import { todayLocalISO } from "@/shared/lib/format-date";

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export interface OfflineWeekProgram {
  program: MeetingProgramItem;
  assignments: MeetingAssignmentItem[];
}

export interface OfflineWeekBundle {
  weekStart: string;
  weekEnd: string;
  schedule: WeeklySchedule;
  midweek: OfflineWeekProgram | null;
  weekend: OfflineWeekProgram | null;
  cleaning: PersonCleaningItem[];
  duties: PersonDutyItem[];
}

export interface OfflineSyncPayload {
  /** Dono do cache (separa usuários no mesmo aparelho). */
  ownerKey: string;
  savedAt: string;
  congregationName: string;
  personName: string | null;
  /** [atual, próxima] — sempre as 2 semanas a partir da segunda-feira corrente. */
  weeks: [OfflineWeekBundle, OfflineWeekBundle];
  upcomingDuties: PersonDutyItem[];
  songs: { number: number; theme: string }[];
  outlines: { number: number; theme: string }[];
  /** Só as semanas da apostila que caem nas 2 semanas (nunca o JSON inteiro). */
  workbookWeeks: Pick<WorkbookContentWeek, "week" | "weekStart" | "meeting">[];
  watchtowerIssues: WatchtowerIssueItem[];
}

/**
 * Pacote offline da semana atual + próxima (programas, Minha semana e
 * conteúdo básico). Chamado logado e online pela ilha `OfflineSync`; o
 * resultado vai ao IndexedDB para a página `~offline` ler sem rede.
 * Falha parcial ou total devolve null (mantém o cache anterior).
 */
export async function syncOfflineWeeks(): Promise<OfflineSyncPayload | null> {
  try {
    const user = await requireAuthenticatedUser();
    const now = new Date();
    const { weekStart } = getWeekRange(now);
    const nextStart = addDaysISO(weekStart, 7);
    const nextEnd = addDaysISO(weekStart, 13);

    const [
      person,
      schedule,
      nextSchedule,
      meetingSchedule,
      songs,
      outlines,
      workbooks,
      watchtower,
    ] = await Promise.all([
      getPersonByUserId(user.id).catch(() => null),
      getWeeklySchedule(now).catch(() => null),
      getWeeklySchedule(new Date(`${nextStart}T12:00:00Z`)).catch(() => null),
      getMeetingSchedule().catch(() => null),
      listSongs().catch(() => []),
      listOutlines().catch(() => []),
      listWorkbookIssues().catch(() => []),
      listWatchtowerIssues().catch(() => []),
    ]);
    if (!schedule || !nextSchedule) return null;

    const personId = person?.id ?? null;
    const isMale = person?.sex === "male";
    const personName = person ? `${person.firstName} ${person.lastName}`.trim() : null;

    async function bundle(
      ws: string,
      we: string,
      sched: WeeklySchedule,
    ): Promise<OfflineWeekBundle> {
      const [midweek, weekend, cleaning, duties] = await Promise.all([
        getMeetingProgram("midweek", ws).catch(() => null),
        getMeetingProgram("weekend", ws).catch(() => null),
        personId
          ? listPersonCleaningInRange(personId, ws, we).catch(() => [])
          : Promise.resolve([]),
        personId && isMale
          ? listPersonDutiesInRange(personId, ws, we).catch(() => [])
          : Promise.resolve([]),
      ]);
      return { weekStart: ws, weekEnd: we, schedule: sched, midweek, weekend, cleaning, duties };
    }

    const [current, next] = await Promise.all([
      bundle(schedule.weekStart, schedule.weekEnd, schedule),
      bundle(nextStart, nextEnd, nextSchedule),
    ]);
    const upcomingDuties =
      personId && isMale
        ? await listUpcomingPersonDuties(personId, todayLocalISO(now)).catch(() => [])
        : [];

    const wanted = new Set([schedule.weekStart, nextStart]);
    const workbookWeeks = workbooks.flatMap((issue) =>
      issue.weeks
        .filter((week) => week.weekStart && wanted.has(week.weekStart))
        .map((week) => ({ week: week.week, weekStart: week.weekStart, meeting: week.meeting })),
    );

    return {
      ownerKey: user.id,
      savedAt: new Date().toISOString(),
      congregationName: meetingSchedule?.congregationName ?? "",
      personName,
      weeks: [current, next],
      upcomingDuties,
      songs: songs.map((s) => ({ number: s.number, theme: s.theme })),
      outlines: outlines.map((o) => ({ number: o.number, theme: o.theme })),
      workbookWeeks,
      watchtowerIssues: watchtower,
    };
  } catch {
    return null;
  }
}

import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import { ScheduleCacheWriter } from "@/features/offline/ScheduleCacheWriter";
import { getMyWeek } from "@/features/weekly-schedule/application/get-my-week";
import { getWeeklySchedule } from "@/features/weekly-schedule/application/get-weekly-schedule";
import { MyWeekSection } from "@/features/weekly-schedule/presentation/MyWeekSection";
import { WeekView } from "@/features/weekly-schedule/presentation/WeekView";
import { PageHeader } from "@/shared/components/PageHeader";
import { WeekCardsSkeleton } from "@/shared/components/skeletons";
import { Button } from "@/shared/components/ui/button";
import { es } from "@/shared/i18n/es";
import { formatDateBR } from "@/shared/lib/format-date";

async function MyWeekLoader({ userId }: { userId: string }) {
  const myWeek = await getMyWeek(userId);
  return <MyWeekSection myWeek={myWeek} />;
}

export default async function HomePage() {
  const [user, schedule] = await Promise.all([getCurrentUser(), getWeeklySchedule()]);

  return (
    <main className="flex flex-col gap-4">
      <PageHeader
        title={es.appName}
        description={es.appDescription}
        meta={`Semana: ${formatDateBR(schedule.weekStart)} — ${formatDateBR(schedule.weekEnd)}`}
      />

      <ScheduleCacheWriter schedule={schedule} />

      {user ? (
        <>
          <nav aria-label={es.seccionesReuniones} className="flex gap-2">
            <Link
              href="/reunioes"
              className="flex h-11 flex-1 items-center justify-center rounded-full bg-accent px-3 text-center font-display text-sm font-medium uppercase tracking-wider text-accent-ink transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]"
            >
              {es.verProgramaCompleto}
            </Link>
            <Link
              href="/designacoes"
              className="flex h-11 flex-1 items-center justify-center rounded-full bg-secondary px-3 text-center font-display text-sm font-medium uppercase tracking-wider text-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]"
            >
              {es.tabDesignaciones}
            </Link>
          </nav>
          <Suspense fallback={<WeekCardsSkeleton />}>
            <MyWeekLoader userId={user.id} />
          </Suspense>
        </>
      ) : (
        <>
          <Suspense fallback={<WeekCardsSkeleton />}>
            <WeekView schedule={schedule} />
          </Suspense>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">{es.signInDescription}</p>
            <Link href="/sign-in">
              <Button variant="outline">{es.signInTitle}</Button>
            </Link>
          </div>
        </>
      )}
    </main>
  );
}

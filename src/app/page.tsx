import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import { ScheduleCacheWriter } from "@/features/offline/ScheduleCacheWriter";
import { getMyWeek } from "@/features/weekly-schedule/application/get-my-week";
import { getWeeklySchedule } from "@/features/weekly-schedule/application/get-weekly-schedule";
import { MyWeekSection } from "@/features/weekly-schedule/presentation/MyWeekSection";
import { WeekView } from "@/features/weekly-schedule/presentation/WeekView";
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
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{es.appName}</h1>
        <p className="text-sm text-muted-foreground">{es.appDescription}</p>
        <p className="text-sm text-muted-foreground">
          Semana: {formatDateBR(schedule.weekStart)} — {formatDateBR(schedule.weekEnd)}
        </p>
      </header>

      <ScheduleCacheWriter schedule={schedule} />

      {user ? (
        <Suspense fallback={<WeekCardsSkeleton />}>
          <MyWeekLoader userId={user.id} />
        </Suspense>
      ) : (
        <>
          <Suspense fallback={<WeekCardsSkeleton />}>
            <WeekView schedule={schedule} />
          </Suspense>
          <Link href="/sign-in">
            <Button variant="outline">{es.signInTitle}</Button>
          </Link>
        </>
      )}
    </main>
  );
}

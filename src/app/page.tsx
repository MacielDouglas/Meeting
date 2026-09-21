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

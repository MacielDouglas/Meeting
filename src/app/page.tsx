import Link from "next/link";
import { AssignmentList } from "@/features/assignments/presentation/AssignmentList";
import { ScheduleCacheWriter } from "@/features/offline/ScheduleCacheWriter";
import { getWeeklySchedule } from "@/features/weekly-schedule/application/get-weekly-schedule";
import { WeekView } from "@/features/weekly-schedule/presentation/WeekView";
import { Button } from "@/shared/components/ui/button";
import { es } from "@/shared/i18n/es";

export default async function HomePage() {
  const schedule = await getWeeklySchedule();

  return (
    <main className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{es.appName}</h1>
        <p className="text-sm text-muted-foreground">{es.appDescription}</p>
      </header>

      <ScheduleCacheWriter schedule={schedule} />
      <WeekView schedule={schedule} />

      <section aria-label="Designaciones" className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Designaciones</h2>
        <AssignmentList assignments={[]} />
      </section>

      <Link href="/sign-in">
        <Button variant="outline">{es.signInTitle}</Button>
      </Link>
    </main>
  );
}

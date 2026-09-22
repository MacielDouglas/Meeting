import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import { listCleaningConfig } from "@/features/cleaning/application/queries";
import { CleaningDesignationSection } from "@/features/cleaning/presentation/CleaningDesignationSection";
import {
  getMeetingSchedule,
  listScheduleExceptions,
  listSpecialEvents,
} from "@/features/settings/application/queries";
import { PageHeader } from "@/shared/components/PageHeader";
import { CalendarSkeleton } from "@/shared/components/skeletons";
import { es } from "@/shared/i18n/es";

export default async function DesignacoesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [cleaningConfig, specialEventsList, exceptionsList, meetingScheduleData] =
    await Promise.all([
      listCleaningConfig(),
      listSpecialEvents(),
      listScheduleExceptions(),
      getMeetingSchedule(),
    ]);

  return (
    <main className="flex flex-col gap-4 pb-28">
      <PageHeader title={es.tabDesignaciones} />

      <Suspense fallback={<CalendarSkeleton />}>
        <CleaningDesignationSection
          cleaningConfig={cleaningConfig}
          specialEvents={specialEventsList}
          scheduleExceptions={exceptionsList}
          meetingSchedule={meetingScheduleData}
        />
      </Suspense>
    </main>
  );
}

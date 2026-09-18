import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/application/session";
import {
  getMeetingSchedule,
  listScheduleExceptions,
  listSpecialEvents,
} from "@/features/settings/application/queries";
import { MeetingScheduleForm } from "@/features/settings/presentation/MeetingScheduleForm";
import { ScheduleExceptionSection } from "@/features/settings/presentation/ScheduleExceptionSection";
import { SpecialEventSection } from "@/features/settings/presentation/SpecialEventSection";
import { es } from "@/shared/i18n/es";

export default async function ConfiguracionPage() {
  const user = await getCurrentUser();
  if (user?.role !== "owner") redirect("/");

  const [schedule, events, exceptions] = await Promise.all([
    getMeetingSchedule(),
    listSpecialEvents(),
    listScheduleExceptions(),
  ]);

  return (
    <main className="flex flex-col gap-4 pb-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{es.configuracion}</h1>
      </header>
      <MeetingScheduleForm initial={schedule} />
      <SpecialEventSection events={events} />
      <ScheduleExceptionSection exceptions={exceptions} />
    </main>
  );
}

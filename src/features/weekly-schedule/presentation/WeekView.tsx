import type { WeeklySchedule } from "@/features/weekly-schedule/domain/schedule";
import { MeetingCard } from "@/features/weekly-schedule/presentation/MeetingCard";

interface WeekViewProps {
  schedule: WeeklySchedule;
}

export function WeekView({ schedule }: WeekViewProps) {
  return (
    <section aria-label="Programa semanal" className="flex flex-col gap-3">
      <MeetingCard meeting={schedule.midweek} title="Reunión entre semana" badge="Entre semana" />
      <MeetingCard
        meeting={schedule.weekend}
        title="Reunión de fin de semana"
        badge="Fin de semana"
      />
    </section>
  );
}

"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import type { CleaningTypeItem } from "@/features/cleaning/application/queries";
import type {
  ScheduleExceptionItem,
  SpecialEventItem,
} from "@/features/settings/application/queries";
import type { MeetingSchedule } from "@/features/settings/domain/settings";
import { CalendarSkeleton, CardSkeleton } from "@/shared/components/skeletons";

// Seções em chunks sob demanda; dados já buscados no server.
const CleaningDesignationSection = dynamic(
  () =>
    import("@/features/cleaning/presentation/CleaningDesignationSection").then(
      (module) => module.CleaningDesignationSection,
    ),
  { ssr: false },
);
const DutySection = dynamic(
  () =>
    import("@/features/meeting-duties/presentation/DutySection").then(
      (module) => module.DutySection,
    ),
  { ssr: false },
);

interface DesignacoesTabsProps {
  secao: "limpeza" | "reuniao";
  cleaningConfig: CleaningTypeItem[];
  specialEvents: SpecialEventItem[];
  scheduleExceptions: ScheduleExceptionItem[];
  meetingSchedule: MeetingSchedule;
  congregationName?: string;
}

export function DesignacoesTabs({
  secao,
  cleaningConfig,
  specialEvents,
  scheduleExceptions,
  meetingSchedule,
  congregationName = "",
}: DesignacoesTabsProps) {
  if (secao === "reuniao") {
    return (
      <Suspense fallback={<CardSkeleton />}>
        <DutySection congregationName={congregationName} />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CleaningDesignationSection
        cleaningConfig={cleaningConfig}
        specialEvents={specialEvents}
        scheduleExceptions={scheduleExceptions}
        meetingSchedule={meetingSchedule}
        congregationName={congregationName}
      />
    </Suspense>
  );
}

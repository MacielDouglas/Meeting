"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import type { CleaningTypeItem } from "@/features/cleaning/application/queries";
import type { DesignationSectorItem } from "@/features/designations/application/queries";
import type {
  ScheduleExceptionItem,
  SpecialEventItem,
} from "@/features/settings/application/queries";
import type { MeetingSchedule } from "@/features/settings/domain/settings";
import { CardSkeleton, FormSkeleton } from "@/shared/components/skeletons";

// Abas em chunks sob demanda; dados já buscados no server.
const MeetingScheduleForm = dynamic(
  () =>
    import("@/features/settings/presentation/MeetingScheduleForm").then(
      (module) => module.MeetingScheduleForm,
    ),
  { ssr: false },
);
const SpecialEventSection = dynamic(
  () =>
    import("@/features/settings/presentation/SpecialEventSection").then(
      (module) => module.SpecialEventSection,
    ),
  { ssr: false },
);
const ScheduleExceptionSection = dynamic(
  () =>
    import("@/features/settings/presentation/ScheduleExceptionSection").then(
      (module) => module.ScheduleExceptionSection,
    ),
  { ssr: false },
);
const CleaningSection = dynamic(
  () =>
    import("@/features/cleaning/presentation/CleaningSection").then(
      (module) => module.CleaningSection,
    ),
  { ssr: false },
);
const DesignationSection = dynamic(
  () =>
    import("@/features/designations/presentation/DesignationSection").then(
      (module) => module.DesignationSection,
    ),
  { ssr: false },
);

interface ConfiguracionTabsProps {
  tab: "reunioes" | "limpeza" | "designacoes";
  schedule: MeetingSchedule;
  events: SpecialEventItem[];
  exceptions: ScheduleExceptionItem[];
  cleaning: CleaningTypeItem[];
  designations: DesignationSectorItem[];
}

export function ConfiguracionTabs({
  tab,
  schedule,
  events,
  exceptions,
  cleaning,
  designations,
}: ConfiguracionTabsProps) {
  if (tab === "limpeza") {
    return (
      <Suspense fallback={<CardSkeleton />}>
        <CleaningSection initial={cleaning} />
      </Suspense>
    );
  }
  if (tab === "designacoes") {
    return (
      <Suspense fallback={<CardSkeleton />}>
        <DesignationSection initial={designations} />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<FormSkeleton fields={4} />}>
      <MeetingScheduleForm initial={schedule} />
      <SpecialEventSection events={events} />
      <ScheduleExceptionSection exceptions={exceptions} />
    </Suspense>
  );
}

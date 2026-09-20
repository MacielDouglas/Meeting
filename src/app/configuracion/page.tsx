import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import { listCleaningConfig } from "@/features/cleaning/application/queries";
import { CleaningSection } from "@/features/cleaning/presentation/CleaningSection";
import { listDesignationConfig } from "@/features/designations/application/queries";
import { DesignationSection } from "@/features/designations/presentation/DesignationSection";
import {
  getMeetingSchedule,
  listScheduleExceptions,
  listSpecialEvents,
} from "@/features/settings/application/queries";
import { MeetingScheduleForm } from "@/features/settings/presentation/MeetingScheduleForm";
import { ScheduleExceptionSection } from "@/features/settings/presentation/ScheduleExceptionSection";
import { SpecialEventSection } from "@/features/settings/presentation/SpecialEventSection";
import { CardSkeleton, FormSkeleton } from "@/shared/components/skeletons";
import { TabNav } from "@/shared/components/TabNav-client";
import { es } from "@/shared/i18n/es";

type ConfigTab = "reunioes" | "limpeza" | "designacoes";

const TABS: { value: ConfigTab; label: string }[] = [
  { value: "reunioes", label: "Reuniões" },
  { value: "limpeza", label: "Limpeza" },
  { value: "designacoes", label: "Designações" },
];

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (user?.role !== "owner") redirect("/");

  const params = (await searchParams) ?? {};
  const tab: ConfigTab =
    params.tab === "limpeza" || params.tab === "designacoes" ? params.tab : "reunioes";

  // Shell server busca só o que a aba ativa precisa (evita 5 queries em toda navegação).
  const needsReunioes = tab === "reunioes";
  const [schedule, events, exceptions, cleaning, designations] = await Promise.all([
    needsReunioes
      ? getMeetingSchedule()
      : Promise.resolve({
          midweekDay: 2 as const,
          midweekTime: "19:30",
          weekendDay: 0 as const,
          weekendTime: "10:00",
        }),
    needsReunioes ? listSpecialEvents() : Promise.resolve([]),
    needsReunioes ? listScheduleExceptions() : Promise.resolve([]),
    tab === "limpeza" ? listCleaningConfig() : Promise.resolve([]),
    tab === "designacoes" ? listDesignationConfig() : Promise.resolve([]),
  ]);

  return (
    <main className="flex flex-col gap-4 pb-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{es.configuracion}</h1>
      </header>

      <Suspense
        fallback={
          <div className="flex gap-2" aria-hidden>
            <div className="h-9 flex-1 animate-pulse rounded-full bg-secondary" />
            <div className="h-9 flex-1 animate-pulse rounded-full bg-secondary" />
            <div className="h-9 flex-1 animate-pulse rounded-full bg-secondary" />
          </div>
        }
      >
        <TabNav
          param="tab"
          defaultValue="reunioes"
          ariaLabel="Seções de configurações"
          items={TABS.map((item) => ({
            value: item.value,
            label: item.label,
            href: `/configuracion?tab=${item.value}`,
          }))}
        />
      </Suspense>

      {tab === "reunioes" && (
        <Suspense fallback={<FormSkeleton fields={4} />}>
          <MeetingScheduleForm initial={schedule} />
          <SpecialEventSection events={events} />
          <ScheduleExceptionSection exceptions={exceptions} />
        </Suspense>
      )}
      {tab === "limpeza" && (
        <Suspense fallback={<CardSkeleton />}>
          <CleaningSection initial={cleaning} />
        </Suspense>
      )}
      {tab === "designacoes" && (
        <Suspense fallback={<CardSkeleton />}>
          <DesignationSection initial={designations} />
        </Suspense>
      )}
    </main>
  );
}

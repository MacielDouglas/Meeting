import { Suspense } from "react";
import { listCleaningConfig } from "@/features/cleaning/application/queries";
import { CleaningDesignationSection } from "@/features/cleaning/presentation/CleaningDesignationSection";
import { DutySection } from "@/features/meeting-duties/presentation/DutySection";
import {
  getMeetingSchedule,
  listScheduleExceptions,
  listSpecialEvents,
} from "@/features/settings/application/queries";
import { PageHeader } from "@/shared/components/PageHeader";
import { CalendarSkeleton, CardSkeleton } from "@/shared/components/skeletons";
import { TabNav } from "@/shared/components/TabNav-client";
import { es } from "@/shared/i18n/es";

type DesignacoesSecao = "limpeza" | "reuniao";

const SECOES: { value: DesignacoesSecao; label: string }[] = [
  { value: "limpeza", label: es.cleaning },
  { value: "reuniao", label: es.enLaReunion },
];

export default async function DesignacoesPage({
  searchParams,
}: {
  searchParams?: Promise<{ secao?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const secao: DesignacoesSecao = params.secao === "reuniao" ? "reuniao" : "limpeza";

  const [cleaningConfig, specialEventsList, exceptionsList, meetingScheduleData] =
    await Promise.all([
      secao === "limpeza" ? listCleaningConfig() : Promise.resolve([]),
      listSpecialEvents(),
      listScheduleExceptions(),
      getMeetingSchedule(),
    ]);

  return (
    <main className="flex flex-col gap-4 pb-28">
      <PageHeader title={es.tabDesignaciones} />

      <Suspense
        fallback={
          <div className="flex gap-2" aria-hidden>
            <div className="h-9 flex-1 animate-pulse rounded-full bg-secondary" />
            <div className="h-9 flex-1 animate-pulse rounded-full bg-secondary" />
          </div>
        }
      >
        <TabNav
          param="secao"
          defaultValue="limpeza"
          ariaLabel={es.seccionesDesignacoes}
          items={SECOES.map((item) => ({
            value: item.value,
            label: item.label,
            href: `/designacoes?secao=${item.value}`,
          }))}
        />
      </Suspense>

      {secao === "limpeza" ? (
        <Suspense fallback={<CalendarSkeleton />}>
          <CleaningDesignationSection
            cleaningConfig={cleaningConfig}
            specialEvents={specialEventsList}
            scheduleExceptions={exceptionsList}
            meetingSchedule={meetingScheduleData}
          />
        </Suspense>
      ) : (
        <Suspense fallback={<CardSkeleton />}>
          <DutySection />
        </Suspense>
      )}
    </main>
  );
}

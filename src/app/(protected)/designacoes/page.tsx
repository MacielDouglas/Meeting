import { Suspense } from "react";
import { listCleaningConfig } from "@/features/cleaning/application/queries";
import { DesignacoesTabs } from "@/features/cleaning/presentation/DesignacoesTabs-client";
import {
  getMeetingSchedule,
  listScheduleExceptions,
  listSpecialEvents,
} from "@/features/settings/application/queries";
import { PageHeader } from "@/shared/components/PageHeader";
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

  const needsCleaning = secao === "limpeza";
  const [cleaningConfig, specialEventsList, exceptionsList, meetingScheduleData] =
    await Promise.all([
      needsCleaning ? listCleaningConfig() : Promise.resolve([]),
      needsCleaning ? listSpecialEvents() : Promise.resolve([]),
      needsCleaning ? listScheduleExceptions() : Promise.resolve([]),
      needsCleaning
        ? getMeetingSchedule()
        : Promise.resolve({
            congregationName: "",
            midweekDay: 2 as const,
            midweekTime: "19:30",
            weekendDay: 0 as const,
            weekendTime: "10:00",
          }),
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

      <DesignacoesTabs
        secao={secao}
        cleaningConfig={cleaningConfig}
        specialEvents={specialEventsList}
        scheduleExceptions={exceptionsList}
        meetingSchedule={meetingScheduleData}
      />
    </main>
  );
}

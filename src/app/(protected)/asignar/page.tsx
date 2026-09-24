import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import { listCleaningConfig } from "@/features/cleaning/application/queries";
import { DesignacoesTabs } from "@/features/cleaning/presentation/DesignacoesTabs-client";
import {
  getMeetingSchedule,
  listScheduleExceptions,
  listSpecialEvents,
} from "@/features/settings/application/queries";
import { PageHeader } from "@/shared/components/PageHeader";
import { TabNavSkeleton } from "@/shared/components/skeletons";
import { TabNav } from "@/shared/components/TabNav-client";
import { es } from "@/shared/i18n/es";

export const metadata: Metadata = { title: es.asignar };

type AsignarSecao = "limpeza" | "reuniao";

const SECOES: { value: AsignarSecao; label: string }[] = [
  { value: "limpeza", label: es.cleaning },
  { value: "reuniao", label: es.enLaReunion },
];

export default async function AsignarPage({
  searchParams,
}: {
  searchParams?: Promise<{ secao?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "owner" && user.role !== "admin") redirect("/designacoes");

  const params = (await searchParams) ?? {};
  const secao: AsignarSecao = params.secao === "reuniao" ? "reuniao" : "limpeza";

  const needsCleaning = secao === "limpeza";
  const [cleaningConfig, specialEventsList, exceptionsList, meetingScheduleData] =
    await Promise.all([
      needsCleaning ? listCleaningConfig() : Promise.resolve([]),
      needsCleaning ? listSpecialEvents() : Promise.resolve([]),
      needsCleaning ? listScheduleExceptions() : Promise.resolve([]),
      // Nome da congregação no cabeçalho do PDF das duas abas.
      getMeetingSchedule(),
    ]);

  return (
    <main className="page-stack">
      <PageHeader title={es.asignar} />

      <Suspense fallback={<TabNavSkeleton tabs={2} />}>
        <TabNav
          param="secao"
          defaultValue="limpeza"
          ariaLabel={es.seccionesDesignacoes}
          items={SECOES.map((item) => ({
            value: item.value,
            label: item.label,
            href: `/asignar?secao=${item.value}`,
          }))}
        />
      </Suspense>

      <DesignacoesTabs
        secao={secao}
        cleaningConfig={cleaningConfig}
        specialEvents={specialEventsList}
        scheduleExceptions={exceptionsList}
        meetingSchedule={meetingScheduleData}
        congregationName={meetingScheduleData.congregationName}
      />
    </main>
  );
}

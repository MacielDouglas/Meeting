import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import { listCleaningConfig } from "@/features/cleaning/application/queries";
import { listDesignationConfig } from "@/features/designations/application/queries";
import {
  getMeetingSchedule,
  listScheduleExceptions,
  listSpecialEvents,
} from "@/features/settings/application/queries";
import { ConfiguracionTabs } from "@/features/settings/presentation/ConfiguracionTabs-client";
import { PageHeader } from "@/shared/components/PageHeader";
import { TabNavSkeleton } from "@/shared/components/skeletons";
import { TabNav } from "@/shared/components/TabNav-client";
import { es } from "@/shared/i18n/es";

export const metadata: Metadata = { title: es.configuracion };

type ConfigTab = "reunioes" | "limpeza" | "designacoes";

const TABS: { value: ConfigTab; label: string }[] = [
  { value: "reunioes", label: "Reuniones" },
  { value: "limpeza", label: "Limpieza" },
  { value: "designacoes", label: "Designaciones" },
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
          congregationName: "",
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
    <main className="page-stack">
      <PageHeader title={es.configuracion} />

      <Suspense fallback={<TabNavSkeleton tabs={3} />}>
        <TabNav
          param="tab"
          defaultValue="reunioes"
          ariaLabel="Secciones de configuración"
          items={TABS.map((item) => ({
            value: item.value,
            label: item.label,
            href: `/administracion/configuracion?tab=${item.value}`,
          }))}
        />
      </Suspense>

      <ConfiguracionTabs
        tab={tab}
        schedule={schedule}
        events={events}
        exceptions={exceptions}
        cleaning={cleaning}
        designations={designations}
      />
    </main>
  );
}

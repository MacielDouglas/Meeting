import Link from "next/link";
import { redirect } from "next/navigation";
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

  const [schedule, events, exceptions, cleaning, designations] = await Promise.all([
    getMeetingSchedule(),
    listSpecialEvents(),
    listScheduleExceptions(),
    listCleaningConfig(),
    listDesignationConfig(),
  ]);

  return (
    <main className="flex flex-col gap-4 pb-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{es.configuracion}</h1>
      </header>

      <nav className="flex gap-2" aria-label="Seções de configurações">
        {TABS.map((item) => (
          <Link
            key={item.value}
            href={`/configuracion?tab=${item.value}`}
            className={`h-9 flex-1 rounded-full px-3 text-sm font-medium transition-colors text-center leading-9 ${
              tab === item.value ? "bg-sky-500 text-white" : "bg-secondary text-muted-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "reunioes" && (
        <>
          <MeetingScheduleForm initial={schedule} />
          <SpecialEventSection events={events} />
          <ScheduleExceptionSection exceptions={exceptions} />
        </>
      )}
      {tab === "limpeza" && <CleaningSection initial={cleaning} />}
      {tab === "designacoes" && <DesignationSection initial={designations} />}
    </main>
  );
}

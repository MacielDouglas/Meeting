import Link from "next/link";
import { Suspense } from "react";
import { FaBookOpen, FaMeetup, FaUserGroup, FaWifi } from "react-icons/fa6";
import { getCurrentUser } from "@/features/auth/application/session";
import { ScheduleCacheWriter } from "@/features/offline/ScheduleCacheWriter";
import { getMyWeek } from "@/features/weekly-schedule/application/get-my-week";
import { getWeeklySchedule } from "@/features/weekly-schedule/application/get-weekly-schedule";
import { MyWeekSection } from "@/features/weekly-schedule/presentation/MyWeekSection";
import { GoogleLoginButton } from "@/shared/components/GoogleLoginButton-client";
import { PageHeader } from "@/shared/components/PageHeader";
import { WeekCardsSkeleton } from "@/shared/components/skeletons";
import { es } from "@/shared/i18n/es";
import { formatDateBR } from "@/shared/lib/format-date";

async function MyWeekLoader({ userId }: { userId: string }) {
  const myWeek = await getMyWeek(userId);
  return <MyWeekSection myWeek={myWeek} />;
}

const HIGHLIGHTS = [
  { icon: FaBookOpen, label: "Programa completo" },
  { icon: FaUserGroup, label: "Designaciones claras" },
  { icon: FaWifi, label: "Funciona sin conexión" },
] as const;

/** Landing pública: sem chrome, sem programa — marca, explicação e login. */
function PublicLanding() {
  return (
    <main className="mx-auto flex min-h-[85dvh] w-full max-w-md flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <span className="grid h-24 w-24 place-items-center rounded-[28px] bg-accent text-accent-ink shadow-[0_1px_2px_rgb(0_0_0/0.25),0_8px_20px_-6px_rgb(0_0_0/0.4),inset_0_1px_1px_rgb(255_255_255/0.3),inset_0_-3px_6px_rgb(0_0_0/0.28)]">
        <FaMeetup aria-hidden size={56} />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-6xl font-semibold uppercase leading-none tracking-wide">
          Meeting
        </h1>
        <p className="font-display text-lg font-medium uppercase tracking-widest text-muted-foreground">
          {es.appDescription}
        </p>
      </div>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        Qué parte, quién sirve y cuándo: el programa de la semana en segundos, en el teléfono,
        incluso sin conexión.
      </p>
      <ul className="flex w-full flex-col gap-2">
        {HIGHLIGHTS.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-card-foreground"
          >
            <item.icon aria-hidden size={18} className="shrink-0 text-accent" />
            {item.label}
          </li>
        ))}
      </ul>
      <GoogleLoginButton />
    </main>
  );
}

export default async function HomePage() {
  const [user, schedule] = await Promise.all([getCurrentUser(), getWeeklySchedule()]);

  if (!user) return <PublicLanding />;

  return (
    <main className="flex flex-col gap-4">
      <PageHeader
        title={es.appName}
        description={es.appDescription}
        meta={`Semana: ${formatDateBR(schedule.weekStart)} — ${formatDateBR(schedule.weekEnd)}`}
      />

      <ScheduleCacheWriter schedule={schedule} />

      <nav aria-label={es.seccionesReuniones} className="flex gap-2">
        <Link
          href="/reunioes"
          className="flex h-11 flex-1 items-center justify-center rounded-full bg-accent px-3 text-center font-display text-sm font-medium uppercase tracking-wider text-accent-ink transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]"
        >
          {es.verProgramaCompleto}
        </Link>
        <Link
          href="/designacoes"
          className="flex h-11 flex-1 items-center justify-center rounded-full bg-secondary px-3 text-center font-display text-sm font-medium uppercase tracking-wider text-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]"
        >
          {es.tabDesignaciones}
        </Link>
      </nav>
      <Suspense fallback={<WeekCardsSkeleton />}>
        <MyWeekLoader userId={user.id} />
      </Suspense>
    </main>
  );
}

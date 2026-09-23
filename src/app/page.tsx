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

async function MyWeekLoader({
  userId,
  canLinkAccount,
}: {
  userId: string;
  canLinkAccount: boolean;
}) {
  const myWeek = await getMyWeek(userId);
  return <MyWeekSection myWeek={myWeek} canLinkAccount={canLinkAccount} />;
}

/** "22/09 — 28/09 de 2026"; anos explícitos só na virada dezembro/janeiro. */
function weekMeta(weekStart: string, weekEnd: string): string {
  const startYear = weekStart.slice(0, 4);
  const endYear = weekEnd.slice(0, 4);
  if (startYear !== endYear) {
    return `Semana: ${formatDateBR(weekStart)}/${startYear} — ${formatDateBR(weekEnd)}/${endYear}`;
  }
  return `Semana: ${formatDateBR(weekStart)} — ${formatDateBR(weekEnd)} de ${endYear}`;
}

const HIGHLIGHTS = [
  { icon: FaBookOpen, label: "Programa completo" },
  { icon: FaUserGroup, label: "Designaciones claras" },
  { icon: FaWifi, label: "Funciona sin conexión" },
] as const;

/** Landing pública: sem chrome, sem programa — marca, explicação e login. */
function PublicLanding() {
  return (
    <main className="mx-auto flex min-h-[80dvh] w-full max-w-md flex-col items-center justify-center gap-5 px-2 py-12 text-center sm:py-16">
      <span className="grid h-20 w-20 place-items-center rounded-[24px] bg-accent text-accent-ink shadow-[0_16px_40px_-16px_rgb(0_0_0/0.45)] motion-safe:animate-[home-rise_.6s_cubic-bezier(.16,1,.3,1)_backwards] sm:h-24 sm:w-24 sm:rounded-[28px]">
        <FaMeetup aria-hidden size={48} className="sm:h-14 sm:w-14" />
      </span>
      <div className="flex flex-col motion-safe:animate-[home-rise_.6s_cubic-bezier(.16,1,.3,1)_backwards] motion-safe:[animation-delay:60ms]">
        <h1 className="text-balance font-display text-5xl font-semibold leading-none tracking-tight sm:text-6xl">
          Meeting
        </h1>
        <p className="mt-2 font-display text-lg font-medium text-muted-foreground">
          {es.appDescription}
        </p>
      </div>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground motion-safe:animate-[home-rise_.6s_cubic-bezier(.16,1,.3,1)_backwards] motion-safe:[animation-delay:120ms]">
        Qué parte, quién sirve y cuándo — en el teléfono, incluso sin conexión.
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
      <div className="mt-1 w-full motion-safe:animate-[home-rise_.6s_cubic-bezier(.16,1,.3,1)_backwards] motion-safe:[animation-delay:180ms]">
        <GoogleLoginButton />
      </div>
    </main>
  );
}

export default async function HomePage() {
  const [user, schedule] = await Promise.all([getCurrentUser(), getWeeklySchedule()]);

  if (!user) return <PublicLanding />;

  return (
    <main className="page-stack">
      <PageHeader
        title={es.appName}
        description={es.appDescription}
        meta={weekMeta(schedule.weekStart, schedule.weekEnd)}
      />

      <ScheduleCacheWriter schedule={schedule} />

      <Suspense fallback={<WeekCardsSkeleton />}>
        <MyWeekLoader
          userId={user.id}
          canLinkAccount={user.role === "owner" || user.role === "admin"}
        />
      </Suspense>
      <div className="tight-stack">
        <Link
          href="/reunioes"
          className="flex h-12 items-center justify-center rounded-xl bg-accent px-3 text-center font-display text-base font-semibold text-accent-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {es.verProgramaCompleto}
        </Link>
        <Link
          href="/designacoes"
          className="flex h-11 items-center justify-center rounded-xl bg-secondary px-3 text-center font-display text-sm font-medium text-secondary-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {es.tabDesignaciones}
        </Link>
      </div>
    </main>
  );
}

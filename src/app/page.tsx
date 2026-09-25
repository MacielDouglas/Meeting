import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FaBookOpen, FaMeetup, FaShieldHalved, FaUserGroup, FaWifi } from "react-icons/fa6";
import { getCurrentUser } from "@/features/auth/application/session";
import { ScheduleCacheWriter } from "@/features/offline/ScheduleCacheWriter";
import { isUserAssociated } from "@/features/organization/application/organization-queries";
import { getMyWeek } from "@/features/weekly-schedule/application/get-my-week";
import { getWeeklySchedule } from "@/features/weekly-schedule/application/get-weekly-schedule";
import { MyWeekSection } from "@/features/weekly-schedule/presentation/MyWeekSection";
import { GoogleLoginButton } from "@/shared/components/GoogleLoginButton-client";
import { WeekCardsSkeleton } from "@/shared/components/skeletons";
import { es } from "@/shared/i18n/es";

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

const HIGHLIGHTS = [
  { id: "programa", icon: FaBookOpen, label: es.homeFeatPrograma },
  { id: "designaciones", icon: FaUserGroup, label: es.homeFeatDesignaciones },
  { id: "offline", icon: FaWifi, label: es.homeFeatOffline },
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
        {es.homeTagline}
      </p>
      <ul className="flex w-full flex-col gap-2">
        {HIGHLIGHTS.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-card-foreground"
          >
            <item.icon aria-hidden size={18} className="shrink-0 text-muted-foreground" />
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
  const user = await getCurrentUser();
  if (!user) return <PublicLanding />;
  // Sem associação à organização: boas-vindas (nunca associa sozinho).
  if (!(await isUserAssociated(user))) redirect("/bienvenida");
  // Programa só é necessário com sessão: visitante não paga a query.
  const schedule = await getWeeklySchedule();
  const isOwner = user.role === "owner";

  return (
    <main className="page-stack">
      <ScheduleCacheWriter schedule={schedule} />

      <Suspense fallback={<WeekCardsSkeleton />}>
        <MyWeekLoader
          userId={user.id}
          canLinkAccount={user.role === "owner" || user.role === "admin"}
        />
      </Suspense>

      {isOwner && (
        <Link
          href="/administracion"
          aria-label={es.verAdministracion}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-card-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <FaShieldHalved aria-hidden size={20} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base font-semibold">{es.administracion}</span>
            <span className="block truncate text-sm text-muted-foreground">
              {es.administracionDesc}
            </span>
          </span>
        </Link>
      )}
    </main>
  );
}

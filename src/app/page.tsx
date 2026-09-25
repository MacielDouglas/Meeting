import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { IconType } from "react-icons";
import { FaMeetup, FaShieldHalved } from "react-icons/fa6";
import { GiBroom } from "react-icons/gi";
import { IoDiamond } from "react-icons/io5";
import { LuWheat } from "react-icons/lu";
import { getCurrentUser } from "@/features/auth/application/session";
import { sectionMetaOf } from "@/features/meetings/domain/section-meta";
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

const PREVIEW_PARTS: {
  id: string;
  section: string;
  Icon: IconType;
  title: string;
  assignee: string;
}[] = [
  {
    id: "tesoros",
    section: "TESOROS DE LA BIBLIA",
    Icon: IoDiamond,
    title: "Tesoros de la Biblia (10 min)",
    assignee: "Hno. Ejemplo",
  },
  {
    id: "maestros",
    section: "SEAMOS MEJORES MAESTROS",
    Icon: LuWheat,
    title: "Seamos mejores maestros (4 min)",
    assignee: "Hna. Ejemplo",
  },
];

/** Pico da landing: a semana como painel de status (gramática do herói),
 *  com exemplo marcado — mesma reunião ilustrativa da Bienvenida. */
function LandingPreview() {
  return (
    <section
      aria-label={`${es.vistaPrevia} (${es.ejemplo})`}
      className="w-full motion-safe:animate-[home-rise_.6s_cubic-bezier(.16,1,.3,1)_backwards] motion-safe:[animation-delay:180ms]"
    >
      <div className="hero-panel overflow-hidden rounded-[20px] text-white ring-1 ring-white/10">
        <div className="flex flex-col gap-1.5 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-white/10 px-2.5 py-1 font-display text-xs font-semibold text-white">
              {es.entreSemana}
            </span>
            <span className="rounded-lg bg-white/10 px-2.5 py-1 font-display text-xs font-semibold text-white">
              {es.ejemplo}
            </span>
          </div>
          <div className="mt-1 flex items-end justify-between gap-3">
            <p className="break-words font-display text-2xl font-semibold leading-none tracking-tight">
              Mié
            </p>
            <p className="shrink-0 font-display text-5xl font-semibold tabular-nums leading-none tracking-tight">
              19:30
            </p>
          </div>
          <ul className="mt-2 flex flex-col divide-y divide-white/10 border-t border-white/10">
            {PREVIEW_PARTS.map((part) => {
              const meta = sectionMetaOf(part.section);
              return (
                <li key={part.id} className="flex items-center gap-3 py-2.5">
                  <span
                    aria-hidden
                    className="section-emblem grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
                    style={{ backgroundColor: meta.color }}
                  >
                    <part.Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                    {part.title}
                  </span>
                  <span className="shrink-0 text-sm font-medium text-white/70">
                    {part.assignee}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="flex items-center gap-2 border-t border-white/10 pt-3 text-sm text-white/70">
            <GiBroom aria-hidden size={18} className="shrink-0" />
            {es.miLimpieza}: Auditorio
          </p>
        </div>
      </div>
    </section>
  );
}

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
      <LandingPreview />
      <div className="mt-1 w-full motion-safe:animate-[home-rise_.6s_cubic-bezier(.16,1,.3,1)_backwards] motion-safe:[animation-delay:240ms]">
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

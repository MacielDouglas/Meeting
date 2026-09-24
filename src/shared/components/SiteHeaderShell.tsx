import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import { getMeetingSchedule } from "@/features/settings/application/queries";
import { SiteHeader } from "@/shared/components/SiteHeader-client";

/** Shell server: busca sessão + congregação e entrega só primitivos à ilha client. */
async function SiteHeaderData() {
  const [user, schedule] = await Promise.all([getCurrentUser(), getMeetingSchedule()]);
  if (!user) return null;
  return (
    <SiteHeader
      showSettings={user?.role === "owner"}
      showAdmin={user?.role === "owner" || user?.role === "admin"}
      isAuthed
      congregationName={schedule.congregationName}
    />
  );
}

function SiteHeaderFallback() {
  return (
    <div aria-hidden className="flex h-11 items-center gap-3">
      <div className="h-11 w-11 motion-safe:animate-pulse rounded-xl bg-secondary" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="h-5 w-28 motion-safe:animate-pulse rounded-lg bg-secondary" />
        <div className="h-3 w-20 motion-safe:animate-pulse rounded-lg bg-secondary" />
      </div>
      <div className="hidden flex-1 items-center gap-1 sm:flex">
        <div className="h-9 flex-1 motion-safe:animate-pulse rounded-xl bg-secondary" />
        <div className="h-9 flex-1 motion-safe:animate-pulse rounded-xl bg-secondary" />
        <div className="h-9 flex-1 motion-safe:animate-pulse rounded-xl bg-secondary" />
      </div>
      <div className="h-11 w-11 motion-safe:animate-pulse rounded-xl bg-secondary" />
    </div>
  );
}

export function SiteHeaderShell() {
  return (
    <Suspense fallback={<SiteHeaderFallback />}>
      <SiteHeaderData />
    </Suspense>
  );
}

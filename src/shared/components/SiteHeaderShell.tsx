import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import { getMeetingSchedule } from "@/features/settings/application/queries";
import { SiteHeader } from "@/shared/components/SiteHeader-client";

/** Shell server: busca sessão + congregação e entrega só primitivos à ilha client. */
async function SiteHeaderData() {
  const [user, schedule] = await Promise.all([getCurrentUser(), getMeetingSchedule()]);
  return (
    <SiteHeader
      showSettings={user?.role === "owner"}
      isAuthed={user != null}
      congregationName={schedule.congregationName}
    />
  );
}

function SiteHeaderFallback() {
  return (
    <div aria-hidden className="flex h-11 items-center gap-3">
      <div className="h-11 w-11 animate-pulse rounded-2xl bg-secondary" />
      <div className="flex flex-col gap-1">
        <div className="h-5 w-28 animate-pulse rounded-lg bg-secondary" />
        <div className="h-3 w-20 animate-pulse rounded-lg bg-secondary" />
      </div>
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

import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import { SiteHeader } from "@/shared/components/SiteHeader-client";

/** Shell server: busca sessão e entrega só booleanos à ilha client. */
async function SiteHeaderData() {
  const user = await getCurrentUser();
  return <SiteHeader showSettings={user?.role === "owner"} isAuthed={user != null} />;
}

function SiteHeaderFallback() {
  return (
    <div aria-hidden className="flex h-11 items-center gap-3">
      <div className="h-11 w-11 animate-pulse rounded-2xl bg-secondary" />
      <div className="h-5 w-28 animate-pulse rounded-lg bg-secondary" />
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

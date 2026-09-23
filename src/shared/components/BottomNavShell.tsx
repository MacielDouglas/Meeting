import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import { BottomNav } from "@/shared/components/BottomNav";

/** Shell server: busca role e entrega só `showSettings` (boolean) à ilha client. */
async function BottomNavData() {
  const user = await getCurrentUser();
  if (!user) return null;
  return <BottomNav showSettings={user?.role === "owner"} />;
}

function BottomNavFallback() {
  return (
    <div aria-hidden className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] sm:max-w-[42rem] lg:max-w-[56rem]">
        <div className="flex h-14 flex-1 flex-col items-center gap-1 py-2">
          <div className="h-9 w-12 animate-pulse rounded-xl bg-secondary" />
        </div>
        <div className="flex h-14 flex-1 flex-col items-center gap-1 py-2">
          <div className="h-9 w-12 animate-pulse rounded-xl bg-secondary" />
        </div>
        <div className="flex h-14 flex-1 flex-col items-center gap-1 py-2">
          <div className="h-9 w-12 animate-pulse rounded-xl bg-secondary" />
        </div>
      </div>
    </div>
  );
}

export function BottomNavShell() {
  return (
    <Suspense fallback={<BottomNavFallback />}>
      <BottomNavData />
    </Suspense>
  );
}

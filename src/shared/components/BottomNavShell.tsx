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
      <div className="mx-auto flex w-full max-w-md items-stretch justify-around px-2">
        <div className="h-14 flex-1 animate-pulse" />
        <div className="h-14 flex-1 animate-pulse" />
        <div className="h-14 flex-1 animate-pulse" />
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

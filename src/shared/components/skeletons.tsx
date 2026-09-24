import { cn } from "@/shared/lib/utils";

function Pulse({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("motion-safe:animate-pulse rounded-lg bg-secondary", className)}
    />
  );
}

/**
 * Ids estáveis por posição para listas de skeleton. Seguro porque os
 * skeletons são estáticos, sem estado e nunca reordenados — cada posição
 * mantém o mesmo id entre renders.
 */
function skeletonIds(prefix: string, count: number): { id: string }[] {
  return Array.from({ length: count }, (_, index) => ({ id: `${prefix}-${index}` }));
}

export function PageHeaderSkeleton({ lines = 2 }: { lines?: 1 | 2 }) {
  return (
    <header className="flex flex-col gap-0 pb-1" aria-hidden>
      <Pulse className="h-8 w-48" />
      {lines === 2 && <Pulse className="mt-1.5 h-4 w-64" />}
    </header>
  );
}

export function TabNavSkeleton({ tabs = 3 }: { tabs?: number }) {
  return (
    <div className="flex gap-1 rounded-xl bg-secondary p-1" aria-hidden>
      {skeletonIds("tab", tabs).map((item) => (
        <Pulse key={item.id} className="h-8 flex-1 rounded-lg bg-background" />
      ))}
    </div>
  );
}

export function WeekCardsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="flex flex-col gap-2 rounded-[20px] bg-secondary p-5">
        <div className="flex gap-2">
          <Pulse className="h-6 w-24 rounded-lg" />
          <Pulse className="h-6 w-16 rounded-lg" />
        </div>
        <Pulse className="h-5 w-28" />
        <Pulse className="h-14 w-40 rounded-xl" />
        <Pulse className="h-4 w-32" />
        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
          <Pulse className="h-4 w-full" />
          <Pulse className="h-4 w-full" />
          <Pulse className="h-4 w-2/3" />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <Pulse className="h-6 w-48" />
        <Pulse className="h-6 w-16 rounded-lg" />
      </div>
      <Pulse className="h-14 w-full rounded-2xl" />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="flex flex-col" aria-hidden>
      {skeletonIds("row", rows).map((item) => (
        <li
          key={item.id}
          className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
        >
          <Pulse className="h-7 w-7 rounded-full" />
          <Pulse className="h-5 flex-1" />
        </li>
      ))}
    </ul>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {skeletonIds("field", fields).map((item) => (
        <div key={item.id} className="flex flex-col gap-1.5">
          <Pulse className="h-4 w-24" />
          <Pulse className="h-11 w-full rounded-xl" />
        </div>
      ))}
      <Pulse className="h-11 w-full rounded-xl" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4" aria-hidden>
      <Pulse className="h-5 w-40" />
      <Pulse className="h-4 w-full" />
      <Pulse className="h-4 w-2/3" />
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Pulse className="h-9 w-full rounded-xl" />
      <Pulse className="h-64 w-full rounded-xl" />
    </div>
  );
}

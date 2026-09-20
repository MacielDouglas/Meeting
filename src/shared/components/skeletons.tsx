import { cn } from "@/shared/lib/utils";

function Pulse({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-secondary", className)} />;
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
    <header className="flex flex-col gap-2" aria-hidden>
      <Pulse className="h-7 w-48" />
      {lines === 2 && <Pulse className="h-4 w-64" />}
    </header>
  );
}

export function TabNavSkeleton({ tabs = 3 }: { tabs?: number }) {
  return (
    <div className="flex gap-2" aria-hidden>
      {skeletonIds("tab", tabs).map((item) => (
        <Pulse key={item.id} className="h-9 flex-1 rounded-full" />
      ))}
    </div>
  );
}

export function WeekCardsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Pulse className="h-32 w-full rounded-xl" />
      <Pulse className="h-32 w-full rounded-xl" />
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
    <div className="flex flex-col gap-2 rounded-xl border bg-background p-4" aria-hidden>
      <Pulse className="h-5 w-40" />
      <Pulse className="h-4 w-full" />
      <Pulse className="h-4 w-2/3" />
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Pulse className="h-9 w-full rounded-full" />
      <Pulse className="h-64 w-full rounded-xl" />
    </div>
  );
}

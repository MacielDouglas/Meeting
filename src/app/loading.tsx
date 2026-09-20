import {
  PageHeaderSkeleton,
  TableSkeleton,
  WeekCardsSkeleton,
} from "@/shared/components/skeletons";

export default function HomeLoading() {
  return (
    <main className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando início">
      <PageHeaderSkeleton />
      <WeekCardsSkeleton />
      <section aria-label="Designaciones" className="flex flex-col gap-2">
        <div aria-hidden className="h-6 w-32 animate-pulse rounded-lg bg-secondary" />
        <TableSkeleton rows={3} />
      </section>
    </main>
  );
}

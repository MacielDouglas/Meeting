import { PageHeaderSkeleton, WeekCardsSkeleton } from "@/shared/components/skeletons";

export default function HomeLoading() {
  return (
    <main className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando inicio">
      <PageHeaderSkeleton />
      <WeekCardsSkeleton />
    </main>
  );
}

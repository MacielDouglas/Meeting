import { PageHeaderSkeleton, WeekCardsSkeleton } from "@/shared/components/skeletons";

export default function HomeLoading() {
  return (
    <main className="page-stack" aria-busy="true" aria-label="Cargando inicio">
      <PageHeaderSkeleton />
      <WeekCardsSkeleton />
    </main>
  );
}

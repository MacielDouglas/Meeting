import { PageHeaderSkeleton, WeekCardsSkeleton } from "@/shared/components/skeletons";

export default function DesignacoesLoading() {
  return (
    <main className="page-stack" aria-busy="true" aria-label="Cargando designaciones">
      <PageHeaderSkeleton lines={1} />
      <WeekCardsSkeleton />
    </main>
  );
}

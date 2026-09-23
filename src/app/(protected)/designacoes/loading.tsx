import { CalendarSkeleton, PageHeaderSkeleton } from "@/shared/components/skeletons";

export default function DesignacoesLoading() {
  return (
    <main className="page-stack" aria-busy="true" aria-label="Cargando designaciones">
      <PageHeaderSkeleton lines={1} />
      <CalendarSkeleton />
    </main>
  );
}

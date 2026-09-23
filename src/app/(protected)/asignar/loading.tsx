import { CalendarSkeleton, PageHeaderSkeleton } from "@/shared/components/skeletons";

export default function AsignarLoading() {
  return (
    <main className="page-stack" aria-busy="true" aria-label="Cargando asignaciones">
      <PageHeaderSkeleton lines={1} />
      <CalendarSkeleton />
    </main>
  );
}

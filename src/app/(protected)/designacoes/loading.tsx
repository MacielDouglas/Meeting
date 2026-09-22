import { CalendarSkeleton, PageHeaderSkeleton } from "@/shared/components/skeletons";

export default function DesignacoesLoading() {
  return (
    <main
      className="flex flex-col gap-4 pb-10"
      aria-busy="true"
      aria-label="Cargando designaciones"
    >
      <PageHeaderSkeleton lines={1} />
      <CalendarSkeleton />
    </main>
  );
}

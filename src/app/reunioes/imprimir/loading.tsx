import { PageHeaderSkeleton, TableSkeleton } from "@/shared/components/skeletons";

export default function ImprimirLoading() {
  return (
    <main className="flex flex-col gap-4 pb-10" aria-busy="true" aria-label="Cargando impresión">
      <PageHeaderSkeleton />
      <TableSkeleton rows={10} />
    </main>
  );
}

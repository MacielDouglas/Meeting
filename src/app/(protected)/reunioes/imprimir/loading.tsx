import { PageHeaderSkeleton, TableSkeleton } from "@/shared/components/skeletons";

export default function ImprimirLoading() {
  return (
    <main className="page-stack" aria-busy="true" aria-label="Cargando impresión">
      <PageHeaderSkeleton />
      <TableSkeleton rows={10} />
    </main>
  );
}

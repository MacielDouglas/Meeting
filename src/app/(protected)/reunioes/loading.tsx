import { PageHeaderSkeleton, TableSkeleton, TabNavSkeleton } from "@/shared/components/skeletons";

export default function ReunioesLoading() {
  return (
    <main className="page-stack" aria-busy="true" aria-label="Cargando reuniones">
      <PageHeaderSkeleton />
      <TabNavSkeleton tabs={3} />
      <TableSkeleton rows={6} />
    </main>
  );
}

import { PageHeaderSkeleton, TableSkeleton, TabNavSkeleton } from "@/shared/components/skeletons";

export default function ReunioesLoading() {
  return (
    <main className="flex flex-col gap-4 pb-10" aria-busy="true" aria-label="Carregando reuniões">
      <PageHeaderSkeleton />
      <TabNavSkeleton tabs={3} />
      <TableSkeleton rows={6} />
    </main>
  );
}

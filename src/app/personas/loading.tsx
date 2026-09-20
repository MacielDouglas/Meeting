import { PageHeaderSkeleton, TableSkeleton, TabNavSkeleton } from "@/shared/components/skeletons";

export default function PersonasLoading() {
  return (
    <main className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando personas">
      <PageHeaderSkeleton lines={1} />
      <TabNavSkeleton tabs={2} />
      <TableSkeleton rows={8} />
    </main>
  );
}

import { PageHeaderSkeleton, TableSkeleton, TabNavSkeleton } from "@/shared/components/skeletons";
import { es } from "@/shared/i18n/es";

export default function ReunioesLoading() {
  return (
    <main className="page-stack" aria-busy="true" aria-label={es.cargandoReuniones}>
      <PageHeaderSkeleton />
      <TabNavSkeleton tabs={3} />
      <TableSkeleton rows={6} />
    </main>
  );
}

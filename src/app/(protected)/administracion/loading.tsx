import { CardSkeleton, PageHeaderSkeleton } from "@/shared/components/skeletons";

export default function AdministracionLoading() {
  return (
    <main className="page-stack" aria-busy="true" aria-label="Cargando administración">
      <PageHeaderSkeleton lines={2} />
      <CardSkeleton />
      <CardSkeleton />
    </main>
  );
}

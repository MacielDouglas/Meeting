import { CardSkeleton, PageHeaderSkeleton } from "@/shared/components/skeletons";

export default function BienvenidaLoading() {
  return (
    <main className="page-stack" aria-busy="true" aria-label="Cargando bienvenida">
      <PageHeaderSkeleton lines={2} />
      <CardSkeleton />
      <CardSkeleton />
    </main>
  );
}

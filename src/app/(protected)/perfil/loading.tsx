import { CardSkeleton, PageHeaderSkeleton } from "@/shared/components/skeletons";

export default function PerfilLoading() {
  return (
    <main className="page-stack" aria-busy="true" aria-label="Cargando perfil">
      <PageHeaderSkeleton lines={1} />
      <CardSkeleton />
      <CardSkeleton />
    </main>
  );
}

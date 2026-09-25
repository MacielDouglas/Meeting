import { FormSkeleton, PageHeaderSkeleton } from "@/shared/components/skeletons";

export default function NuevaPersonaLoading() {
  return (
    <main className="page-stack" aria-busy="true" aria-label="Cargando nueva persona">
      <PageHeaderSkeleton lines={1} />
      <FormSkeleton fields={6} />
    </main>
  );
}

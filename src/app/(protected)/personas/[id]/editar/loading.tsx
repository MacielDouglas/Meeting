import { FormSkeleton } from "@/shared/components/skeletons";

export default function EditarPersonaLoading() {
  return (
    <main className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando edición de persona">
      <div aria-hidden className="h-7 w-52 rounded-lg bg-secondary motion-safe:animate-pulse" />
      <FormSkeleton fields={6} />
    </main>
  );
}

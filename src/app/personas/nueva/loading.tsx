import { FormSkeleton } from "@/shared/components/skeletons";

export default function NuevaPersonaLoading() {
  return (
    <main className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando nova persona">
      <div aria-hidden className="h-7 w-40 animate-pulse rounded-lg bg-secondary" />
      <FormSkeleton fields={6} />
    </main>
  );
}

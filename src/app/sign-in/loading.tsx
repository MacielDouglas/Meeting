import { CardSkeleton } from "@/shared/components/skeletons";

export default function SignInLoading() {
  return (
    <main
      className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8"
      aria-busy="true"
      aria-label="Cargando inicio de sesión"
    >
      <CardSkeleton />
    </main>
  );
}

import { CardSkeleton } from "@/shared/components/skeletons";

export default function SignInLoading() {
  return (
    <main
      className="flex flex-1 flex-col justify-center gap-4"
      aria-busy="true"
      aria-label="Cargando inicio de sesión"
    >
      <CardSkeleton />
    </main>
  );
}

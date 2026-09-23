"use client";

import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 py-8"
      role="alert"
    >
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-col">
          <CardTitle className="font-display text-3xl font-semibold leading-tight tracking-tight">
            Algo salió mal
          </CardTitle>
          <CardDescription className="mt-1.5">
            {error.message || "No fue posible cargar esta página. Inténtalo de nuevo."}
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset}>Reintentar</Button>
          <Link href="/">
            <Button variant="outline">Volver al inicio</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}

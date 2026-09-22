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
    <main className="flex flex-1 flex-col justify-center gap-4" role="alert">
      <Card className="flex flex-col gap-3">
        <CardTitle className="font-display text-3xl font-semibold leading-tight tracking-tight">
          Algo salió mal
        </CardTitle>
        <CardDescription>
          {error.message || "No fue posible cargar esta página. Inténtalo de nuevo."}
        </CardDescription>
        <div className="flex gap-2">
          <Button onClick={reset}>Reintentar</Button>
          <Link href="/">
            <Button variant="outline">Volver al inicio</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}

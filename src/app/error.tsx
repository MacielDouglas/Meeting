"use client";

import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

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
      <h1 className="sr-only">{es.errorTitle}</h1>
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-col">
          <CardTitle className="font-display text-4xl font-semibold leading-[1.1] tracking-tight">
            {es.errorTitle}
          </CardTitle>
          <CardDescription className="mt-1.5">{error.message || es.errorGeneric}</CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset}>{es.reintentar}</Button>
          <Link href="/">
            <Button variant="outline">{es.backToHome}</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}

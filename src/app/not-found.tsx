import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 py-8">
      <h1 className="sr-only">{es.notFoundTitle}</h1>
      <Card className="flex flex-col gap-4 p-6">
        <CardTitle className="font-display text-4xl font-semibold leading-[1.1] tracking-tight">
          {es.notFoundTitle}
        </CardTitle>
        <CardDescription>{es.notFoundDesc}</CardDescription>
      </Card>
      <Link href="/" className="self-start">
        <Button variant="outline">{es.backToHome}</Button>
      </Link>
    </main>
  );
}

import Link from "next/link";
import { Card, CardDescription } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 py-8">
      <Card className="flex flex-col gap-4 p-6">
        <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight">
          {es.notFoundTitle}
        </h1>
        <CardDescription>{es.notFoundDesc}</CardDescription>
      </Card>
      <Link
        href="/"
        className="self-start inline-flex w-full items-center justify-center gap-2 rounded-xl font-display text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto border border-input bg-background h-11 px-4"
      >
        {es.backToHome}
      </Link>
    </main>
  );
}

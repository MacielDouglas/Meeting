import Link from "next/link";
import { Card, CardDescription } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

export default function EditPersonNotFound() {
  return (
    <main className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold leading-7">{es.editNotFoundTitle}</h1>
        <CardDescription>{es.editNotFoundDesc}</CardDescription>
      </Card>
      <Link
        href="/personas"
        className="self-start inline-flex w-full items-center justify-center gap-2 rounded-xl font-display text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto border border-input bg-background h-11 px-4"
      >
        {es.volverAPersonas}
      </Link>
    </main>
  );
}

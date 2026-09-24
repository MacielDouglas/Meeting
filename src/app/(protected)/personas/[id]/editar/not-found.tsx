import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

export default function EditPersonNotFound() {
  return (
    <main className="flex flex-col gap-4">
      <h1 className="sr-only">{es.editNotFoundTitle}</h1>
      <Card className="flex flex-col gap-2">
        <CardTitle>{es.editNotFoundTitle}</CardTitle>
        <CardDescription>{es.editNotFoundDesc}</CardDescription>
      </Card>
      <Link href="/personas">
        <Button variant="outline">{es.volverAPersonas}</Button>
      </Link>
    </main>
  );
}

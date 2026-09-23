import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 py-8">
      <Card className="flex flex-col gap-4 p-6">
        <CardTitle className="font-display text-3xl font-semibold leading-tight tracking-tight">
          Página no encontrada
        </CardTitle>
        <CardDescription>La página que buscas no existe o fue movida.</CardDescription>
      </Card>
      <Link href="/" className="self-start">
        <Button variant="outline">Volver al inicio</Button>
      </Link>
    </main>
  );
}

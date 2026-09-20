import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col justify-center gap-4">
      <Card className="flex flex-col gap-2">
        <CardTitle>Página no encontrada</CardTitle>
        <CardDescription>La página que buscas no existe o fue movida.</CardDescription>
      </Card>
      <Link href="/">
        <Button variant="outline">Volver al inicio</Button>
      </Link>
    </main>
  );
}

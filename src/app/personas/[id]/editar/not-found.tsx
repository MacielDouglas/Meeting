import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";

export default function EditPersonNotFound() {
  return (
    <main className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <CardTitle>Persona no encontrada</CardTitle>
        <CardDescription>Esta persona no existe o fue eliminada.</CardDescription>
      </Card>
      <Link href="/personas">
        <Button variant="outline">Volver a personas</Button>
      </Link>
    </main>
  );
}

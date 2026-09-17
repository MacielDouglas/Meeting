import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col justify-center gap-4">
      <Card className="flex flex-col gap-2">
        <CardTitle>{es.offlineTitle}</CardTitle>
        <CardDescription>{es.offlineDescription}</CardDescription>
      </Card>
      <Link href="/">
        <Button variant="outline">{es.backToHome}</Button>
      </Link>
    </main>
  );
}

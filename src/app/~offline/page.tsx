import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 py-8">
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-col">
          <CardTitle className="font-display text-4xl font-semibold leading-[1.1] tracking-tight">
            {es.offlineTitle}
          </CardTitle>
          <CardDescription className="mt-1.5">{es.offlineDescription}</CardDescription>
        </div>
      </Card>
      <Link href="/" className="self-start">
        <Button variant="outline">{es.backToHome}</Button>
      </Link>
    </main>
  );
}

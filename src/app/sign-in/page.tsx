import Link from "next/link";
import { SignInButton } from "@/features/auth/presentation/SignInButton";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

export default function SignInPage() {
  return (
    <main className="flex flex-1 flex-col justify-center gap-4">
      <Card className="flex flex-col gap-3">
        <CardTitle className="font-display text-3xl font-semibold leading-tight tracking-tight">
          {es.signInTitle}
        </CardTitle>
        <CardDescription>{es.signInDescription}</CardDescription>
        <SignInButton />
      </Card>
      <Link href="/">
        <Button variant="ghost">{es.backToHome}</Button>
      </Link>
    </main>
  );
}

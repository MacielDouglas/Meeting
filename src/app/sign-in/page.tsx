import Link from "next/link";
import { SignInButton } from "@/features/auth/presentation/SignInButton";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 py-8">
      <h1 className="sr-only">{es.signInTitle}</h1>
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-col">
          <CardTitle className="font-display text-4xl font-semibold leading-[1.1] tracking-tight">
            {es.signInTitle}
          </CardTitle>
          <CardDescription className="mt-1.5">{es.signInDescription}</CardDescription>
        </div>
        <SignInButton />
      </Card>
      <Link href="/" className="self-start">
        <Button variant="ghost">{es.backToHome}</Button>
      </Link>
    </main>
  );
}

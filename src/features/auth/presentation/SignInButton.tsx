"use client";

import { useState } from "react";
import { FaGoogle } from "react-icons/fa6";
import { authClient } from "@/features/auth/presentation/auth-client";
import { Button } from "@/shared/components/ui/button";
import { es } from "@/shared/i18n/es";

export function SignInButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      // Sucesso = redirect ao Google: mantém o loading até sair da página.
      const result = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
      if (result?.error) {
        setError(es.errorLogin);
        setIsLoading(false);
      }
    } catch {
      setError(es.errorLogin);
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleSignIn} disabled={isLoading} size="lg">
        <FaGoogle aria-hidden />
        {isLoading ? "Cargando…" : es.signInWithGoogle}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

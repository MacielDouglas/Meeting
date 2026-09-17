"use client";

import { useState } from "react";
import { FaGoogle } from "react-icons/fa6";
import { authClient } from "@/features/auth/presentation/auth-client";
import { Button } from "@/shared/components/ui/button";
import { es } from "@/shared/i18n/es";

export function SignInButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    setIsLoading(true);
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button onClick={handleSignIn} disabled={isLoading} size="lg">
      <FaGoogle aria-hidden />
      {isLoading ? "Cargando…" : es.signInWithGoogle}
    </Button>
  );
}

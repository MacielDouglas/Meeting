"use client";

import { useState } from "react";
import { FaMeetup } from "react-icons/fa";
import { authClient } from "@/features/auth/presentation/auth-client";
import { es } from "@/shared/i18n/es";
import { cn } from "@/shared/lib/utils";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.3h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.6 2.8c2.2-2 3.8-5 3.8-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-3.7 2.9c2 3.9 5.9 6.7 10.5 6.7z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4L1.5 6.7C.5 8.6 0 10.2 0 12s.5 3.4 1.5 4.9l3.7-2.5z"
      />
      <path
        fill="#EA4335"
        d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.4 0 3.5 2.7 1.5 6.6l3.7 2.9c1-2.9 3.6-4.8 6.8-4.8z"
      />
    </svg>
  );
}

/** Ilha client mínima: botão de login social (Google) da landing pública. */
export function GoogleLoginButton({ className }: { className?: string }) {
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
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <button
        type="button"
        disabled={isLoading}
        onClick={() => void handleSignIn()}
        className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-accent px-6 font-display text-lg font-semibold text-accent-ink shadow-[0_12px_32px_-12px_rgb(0_0_0/0.45)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-70"
      >
        {isLoading ? (
          <FaMeetup aria-hidden size={22} className="motion-safe:animate-pulse" />
        ) : (
          <GoogleMark className="h-6 w-6 shrink-0 rounded-full bg-white p-0.5" />
        )}
        {isLoading ? "Cargando…" : es.signInWithGoogle}
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

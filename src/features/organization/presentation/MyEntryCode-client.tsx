"use client";

import { useState } from "react";
import { createJoinToken } from "@/features/organization/application/organization-actions";
import type { MyJoinToken } from "@/features/organization/application/organization-queries";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

export function MyEntryCode({ initial }: { initial: MyJoinToken | null }) {
  const [code, setCode] = useState<string | null>(initial?.code ?? null);
  const [expiresAt, setExpiresAt] = useState<string | null>(initial?.expiresAt ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleGenerate() {
    setError(null);
    setPending(true);
    try {
      const result = await createJoinToken();
      if (result.ok && result.code) {
        setCode(result.code);
        setExpiresAt(result.expiresAt ?? null);
      } else {
        setError(result.error ?? null);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-2">
      <CardTitle>{es.miCodigoEntrada}</CardTitle>
      <CardDescription>{es.miCodigoEntradaDesc}</CardDescription>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {code && (
        <div
          role="status"
          aria-label={`${es.codigoEntrada}: ${code}`}
          className="flex flex-col items-center gap-1 rounded-xl bg-secondary px-3 py-4"
        >
          <p
            aria-hidden="true"
            className="font-mono text-3xl font-semibold tracking-[0.2em] tabular-nums"
          >
            {code}
          </p>
          {expiresAt && (
            <p className="text-xs tabular-nums text-muted-foreground">
              {`${es.codigoExpira}: ${new Date(expiresAt).toLocaleDateString("es-ES")}`}
            </p>
          )}
        </div>
      )}
      <Button
        type="button"
        size="lg"
        variant="secondary"
        disabled={pending}
        onClick={() => void handleGenerate()}
      >
        {code ? es.generarNuevoCodigo : es.generarCodigo}
      </Button>
      {code && <p className="text-xs text-muted-foreground">{es.codigoCopiadoHint}</p>}
    </Card>
  );
}

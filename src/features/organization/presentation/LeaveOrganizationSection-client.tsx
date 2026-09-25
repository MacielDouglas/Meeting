"use client";

import { useState } from "react";
import { leaveOrganization } from "@/features/organization/application/organization-actions";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

export function LeaveOrganizationSection() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleLeave() {
    if (!window.confirm(es.confirmSalirOrganizacion)) return;
    setError(null);
    setPending(true);
    try {
      const result = await leaveOrganization();
      if (!result.ok) setError(result.error ?? null);
      // Sucesso redireciona às boas-vindas no server (NEXT_REDIRECT).
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-2">
      <CardTitle>{es.salirOrganizacion}</CardTitle>
      <CardDescription>{es.confirmSalirOrganizacion}</CardDescription>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button
        type="button"
        size="lg"
        variant="outline"
        disabled={pending}
        onClick={() => void handleLeave()}
      >
        {es.salirOrganizacion}
      </Button>
    </Card>
  );
}

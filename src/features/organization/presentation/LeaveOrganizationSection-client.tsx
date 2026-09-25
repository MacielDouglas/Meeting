"use client";

import { useState } from "react";
import { leaveOrganization } from "@/features/organization/application/organization-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";
import { isNextRedirectError } from "@/shared/lib/redirect-error";

export function LeaveOrganizationSection() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleLeave() {
    setError(null);
    setPending(true);
    try {
      const result = await leaveOrganization();
      if (!result.ok) {
        setError(result.error ?? null);
        setPending(false);
      }
      // Sucesso redireciona às boas-vindas no server (NEXT_REDIRECT).
    } catch (error) {
      if (isNextRedirectError(error)) throw error;
      setError(es.errorGuardar);
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-2">
      <CardTitle>{es.salirOrganizacion}</CardTitle>
      <CardDescription>{es.confirmSalirOrganizacion}</CardDescription>
      {error && !confirming && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button
        type="button"
        size="lg"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
      >
        {es.salirOrganizacion}
      </Button>
      <AlertDialog
        open={confirming}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirming(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{es.salirOrganizacion}</AlertDialogTitle>
            <AlertDialogDescription>{es.confirmSalirOrganizacion}</AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{es.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                void handleLeave();
              }}
            >
              {es.salirOrganizacion}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

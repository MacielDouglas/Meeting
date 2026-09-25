"use client";

import { useState } from "react";
import { deletePerson } from "@/features/people/application/actions";
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
import { es } from "@/shared/i18n/es";
import { isNextRedirectError } from "@/shared/lib/redirect-error";

export function DeletePersonButton({
  personId,
  className,
}: {
  personId: string;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setPending(true);
    try {
      const result = await deletePerson(personId);
      if (!result.ok) {
        setError(result.error ?? null);
        setPending(false);
      }
      // Sucesso redireciona no server (NEXT_REDIRECT).
    } catch (error) {
      if (isNextRedirectError(error)) throw error;
      setError(es.errorExcluir);
      setPending(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        className={className}
      >
        {es.delete}
      </Button>
      <AlertDialog
        open={confirming}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirming(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{es.delete}</AlertDialogTitle>
            <AlertDialogDescription>{es.confirmDeletePerson}</AlertDialogDescription>
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
                void handleDelete();
              }}
            >
              {es.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

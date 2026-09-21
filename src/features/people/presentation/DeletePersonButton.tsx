"use client";

import { useState } from "react";
import { deletePerson } from "@/features/people/application/actions";
import { Button } from "@/shared/components/ui/button";
import { es } from "@/shared/i18n/es";

export function DeletePersonButton({
  personId,
  className,
}: {
  personId: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!window.confirm(es.confirmDeletePerson)) return;
    setPending(true);
    try {
      await deletePerson(personId);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => void handleDelete()}
      className={className}
    >
      {es.delete}
    </Button>
  );
}

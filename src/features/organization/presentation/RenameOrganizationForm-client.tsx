"use client";

import { type FormEvent, useState } from "react";
import { renameOrganization } from "@/features/organization/application/organization-actions";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";
import { TextField } from "@/shared/components/ui/input";
import { es } from "@/shared/i18n/es";

export function RenameOrganizationForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      const result = await renameOrganization({ name });
      if (result.ok) {
        setSaved(true);
      } else {
        setError(result.error ?? null);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-2">
      <CardTitle>{es.nombreCongregacion}</CardTitle>
      <CardDescription>{es.nombreCongregacionHint}</CardDescription>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-success">
          {es.nombreGuardado}
        </p>
      )}
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-1">
        <TextField
          id="organization-name"
          label={es.congregacion}
          value={name}
          onChange={setName}
          placeholder="Española Ipojuca"
          maxLength={120}
          required
        />
        <Button type="submit" size="lg" disabled={pending}>
          {es.save}
        </Button>
      </form>
    </Card>
  );
}

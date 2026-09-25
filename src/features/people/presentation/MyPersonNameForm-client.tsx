"use client";

import { type FormEvent, useState } from "react";
import { updateMyPersonName } from "@/features/people/application/actions";
import { Button } from "@/shared/components/ui/button";
import { Card, CardTitle } from "@/shared/components/ui/card";
import { TextField } from "@/shared/components/ui/input";
import { es } from "@/shared/i18n/es";

export function MyPersonNameForm({
  initialFirstName,
  initialLastName,
}: {
  initialFirstName: string;
  initialLastName: string;
}) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      const result = await updateMyPersonName({ firstName, lastName });
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
      <CardTitle>{es.linkedPerson}</CardTitle>
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
          id="my-first-name"
          label={es.firstName}
          value={firstName}
          onChange={setFirstName}
          maxLength={80}
          required
        />
        <TextField
          id="my-last-name"
          label={es.lastName}
          value={lastName}
          onChange={setLastName}
          maxLength={80}
          required
        />
        <Button type="submit" size="lg" disabled={pending}>
          {es.save}
        </Button>
      </form>
    </Card>
  );
}

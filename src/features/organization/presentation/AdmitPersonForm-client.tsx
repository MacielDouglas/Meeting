"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import type { PersonOption } from "@/features/people/application/queries";
import { Button } from "@/shared/components/ui/button";
import { FieldRow, SelectField, TextField } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { es } from "@/shared/i18n/es";

export interface AdmitPersonSubmit {
  role: "admin" | "member";
  personId?: string;
  newPerson?: { firstName: string; lastName: string; sex: "male" | "female"; young: boolean };
}

export interface AdmitPersonResult {
  ok: boolean;
  error?: string | null;
  userName?: string;
}

interface AdmitPersonFormProps {
  /** Prefixo dos ids dos campos (único por linha). */
  idPrefix: string;
  persons: PersonOption[];
  /** Link para criar a pessoa completa com o usuário pré-selecionado. */
  fullCreateHref: string;
  /** Papel fixo (convite) ou seletor (código). */
  roleFixed?: "admin" | "member";
  onSubmit: (input: AdmitPersonSubmit) => Promise<AdmitPersonResult>;
  onAdmitted: (userName: string | undefined, role: "admin" | "member") => void;
}

type Mode = "existing" | "basic";

/**
 * Vínculo obrigatório na admissão: pessoa existente livre, nova básica
 * (nome, sexo, jovem) ou link para a criação completa.
 */
export function AdmitPersonForm({
  idPrefix,
  persons,
  fullCreateHref,
  roleFixed,
  onSubmit,
  onAdmitted,
}: AdmitPersonFormProps) {
  const [mode, setMode] = useState<Mode>(persons.length > 0 ? "existing" : "basic");
  const [personId, setPersonId] = useState(persons[0]?.id ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sex, setSex] = useState("male");
  const [young, setYoung] = useState(false);
  const [role, setRole] = useState<"admin" | "member">(roleFixed ?? "member");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (mode === "existing" && personId.trim() === "") {
      setError(es.eligePersonaObligatorio);
      return;
    }
    setPending(true);
    try {
      const result = await onSubmit({
        role: roleFixed ?? role,
        ...(mode === "existing"
          ? { personId }
          : { newPerson: { firstName, lastName, sex: sex as "male" | "female", young } }),
      });
      if (!result.ok) {
        setError(result.error ?? null);
      } else {
        onAdmitted(result.userName, roleFixed ?? role);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-1 rounded-xl border border-border p-3"
    >
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {!roleFixed && (
        <SelectField
          id={`${idPrefix}-role`}
          label={es.role}
          value={role}
          onChange={(value) => setRole(value === "admin" ? "admin" : "member")}
          options={[
            { value: "member", label: es.roleMember },
            { value: "admin", label: es.roleAdmin },
          ]}
        />
      )}
      <SelectField
        id={`${idPrefix}-mode`}
        label={es.elegirPersona}
        value={mode}
        onChange={(value) => setMode(value === "basic" ? "basic" : "existing")}
        options={[
          { value: "existing", label: es.personaExistente },
          { value: "basic", label: es.personaNuevaBasica },
        ]}
      />
      {mode === "existing" ? (
        persons.length === 0 ? (
          <p className="py-1 text-sm text-muted-foreground">{es.sinPersonasLibres}</p>
        ) : (
          <SelectField
            id={`${idPrefix}-person`}
            label={es.administracionPersonas}
            value={personId}
            onChange={setPersonId}
            options={persons.map((person) => ({ value: person.id, label: person.label }))}
          />
        )
      ) : (
        <>
          <TextField
            id={`${idPrefix}-first-name`}
            label={es.firstName}
            value={firstName}
            onChange={setFirstName}
            maxLength={80}
            required
          />
          <TextField
            id={`${idPrefix}-last-name`}
            label={es.lastName}
            value={lastName}
            onChange={setLastName}
            maxLength={80}
            required
          />
          <SelectField
            id={`${idPrefix}-sex`}
            label={es.sex}
            value={sex}
            onChange={setSex}
            options={[
              { value: "male", label: es.brother },
              { value: "female", label: es.sister },
            ]}
          />
          <FieldRow
            label={es.young}
            control={<Switch label={es.young} checked={young} onCheckedChange={setYoung} />}
          />
        </>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {es.admitir}
      </Button>
      <Link
        href={fullCreateHref}
        className="text-center text-sm font-medium text-accent underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {es.personaCompleta}
      </Link>
      <p className="text-center text-xs text-muted-foreground">{es.personaCompletaHint}</p>
    </form>
  );
}

"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import { createPerson, updatePerson } from "@/features/people/application/actions";
import {
  DEFAULT_PERSON_FORM,
  normalizePersonValues,
  type PersonFormValues,
} from "@/features/people/application/person-validation";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { FieldRow, SelectField, TextField } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { es } from "@/shared/i18n/es";

interface PersonFormProps {
  mode: "create" | "edit";
  personId?: string;
  initial?: PersonFormValues;
  familyOptions: { id: string; label: string }[];
  userOptions: { id: string; label: string }[];
  enabledDesignationFlags?: string[];
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="px-1 text-sm font-medium text-muted-foreground">{title}</h2>
      <Card className="flex flex-col divide-y divide-border px-4 py-1">{children}</Card>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onToggle,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <FieldRow
      label={label}
      control={
        <Switch label={label} checked={checked} disabled={disabled} onCheckedChange={onToggle} />
      }
    />
  );
}

export function PersonForm({
  mode,
  personId,
  initial,
  familyOptions,
  userOptions,
  enabledDesignationFlags = ["usher", "sound", "video", "microphone", "platform"],
}: PersonFormProps) {
  const [values, setValues] = useState<PersonFormValues>(initial ?? DEFAULT_PERSON_FORM);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isFemale = values.sex === "female";
  const showService = values.baptized;
  const showMeetings = values.elder || values.ministerialServant;
  const can = (flag: string) => enabledDesignationFlags.includes(flag);

  function setField<K extends keyof PersonFormValues>(field: K, value: PersonFormValues[K]) {
    setValues((previous) => {
      const updated = { ...previous, [field]: value } as PersonFormValues;
      if (field === "elder" && value === true) updated.ministerialServant = false;
      if (field === "ministerialServant" && value === true) updated.elder = false;
      return normalizePersonValues(updated);
    });
  }

  function toggle<K extends keyof PersonFormValues>(field: K) {
    return (checked: PersonFormValues[K]) => {
      setField(field, checked);
    };
  }

  function handleSexChange(sex: "male" | "female") {
    setValues((previous) => normalizePersonValues({ ...previous, sex }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result =
        mode === "create"
          ? await createPerson(values)
          : await updatePerson({ ...values, id: personId ?? "" });
      if (!result.ok) {
        setError(result.error ?? null);
        setPending(false);
      }
    } catch {
      setPending(false);
    }
  }

  return (
    <form
      id="person-form"
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-4 pb-14"
    >
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/50 px-3 py-2 text-sm text-red-500"
        >
          {error}
        </p>
      )}

      <Section title={es.personalInfo}>
        <TextField
          id="firstName"
          label={es.firstName}
          value={values.firstName}
          onChange={(value) => setField("firstName", value)}
          required
        />
        <TextField
          id="lastName"
          label={es.lastName}
          value={values.lastName}
          onChange={(value) => setField("lastName", value)}
          required
        />
        <div className="flex flex-col gap-1 py-2">
          {(["male", "female"] as const).map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center justify-between py-1.5 text-sm"
            >
              <span>{option === "male" ? es.brother : es.sister}</span>
              <input
                type="radio"
                name="sex"
                checked={values.sex === option}
                onChange={() => handleSexChange(option)}
                className="h-6 w-6 accent-sky-500"
              />
            </label>
          ))}
        </div>
        <Toggle label={es.young} checked={values.young} onToggle={toggle("young")} />
      </Section>

      <Section title={es.family}>
        <FieldRow
          label={es.familyHead}
          control={
            <Switch
              label={es.familyHead}
              checked={values.familyHead}
              onCheckedChange={toggle("familyHead")}
            />
          }
        />
        {!values.familyHead && (
          <SelectField
            id="familyMemberId"
            label={es.familyMember}
            value={values.familyMemberId ?? ""}
            options={[
              { value: "", label: es.noFamilyMember },
              ...familyOptions.map((option) => ({ value: option.id, label: option.label })),
            ]}
            onChange={(value) => setField("familyMemberId", value === "" ? null : value)}
          />
        )}
        <SelectField
          id="userId"
          label={es.linkedUser}
          value={values.userId ?? ""}
          disabled={userOptions.length === 0 && !values.userId}
          options={
            userOptions.length === 0 && !values.userId
              ? [{ value: "", label: es.noAvailableUsers }]
              : [
                  { value: "", label: es.noLinkedUser },
                  ...userOptions.map((option) => ({ value: option.id, label: option.label })),
                ]
          }
          onChange={(value) => setField("userId", value === "" ? null : value)}
        />
      </Section>

      <Section title={es.assignments}>
        <Toggle label={es.cleaning} checked={values.cleaning} onToggle={toggle("cleaning")} />
        <Toggle label={es.helper} checked={values.helper} onToggle={toggle("helper")} />
        <Toggle
          label={es.startConversations}
          checked={values.startConversations}
          onToggle={toggle("startConversations")}
        />
        <Toggle
          label={es.returnVisits}
          checked={values.returnVisits}
          onToggle={toggle("returnVisits")}
        />
        <Toggle
          label={es.makeDisciples}
          checked={values.makeDisciples}
          onToggle={toggle("makeDisciples")}
        />
        <Toggle
          label={es.explainBeliefs}
          checked={values.explainBeliefs}
          onToggle={toggle("explainBeliefs")}
        />
        <Toggle
          label={es.betterSpeech}
          checked={values.betterSpeech}
          onToggle={toggle("betterSpeech")}
          disabled={isFemale}
        />
        <Toggle
          label={es.bibleReading}
          checked={values.bibleReading}
          onToggle={toggle("bibleReading")}
          disabled={isFemale}
        />
      </Section>

      {!isFemale && (
        <Section title={es.privileges}>
          <Toggle
            label={es.baptized}
            checked={values.baptized}
            onToggle={toggle("baptized")}
            disabled={isFemale}
          />
          {can("sound") && (
            <Toggle
              label={es.sound}
              checked={values.sound}
              onToggle={toggle("sound")}
              disabled={isFemale}
            />
          )}
          {can("video") && (
            <Toggle
              label={es.video}
              checked={values.video}
              onToggle={toggle("video")}
              disabled={isFemale}
            />
          )}
          {can("platform") && (
            <Toggle
              label={es.platform}
              checked={values.platform}
              onToggle={toggle("platform")}
              disabled={isFemale}
            />
          )}
          {can("microphone") && (
            <Toggle
              label={es.microphone}
              checked={values.microphone}
              onToggle={toggle("microphone")}
              disabled={isFemale}
            />
          )}
        </Section>
      )}

      {!isFemale && showService && (
        <Section title={es.servicePrivileges}>
          <Toggle
            label={es.prayer}
            checked={values.prayer}
            onToggle={toggle("prayer")}
            disabled={isFemale}
          />
          <Toggle
            label={es.studyReader}
            checked={values.studyReader}
            onToggle={toggle("studyReader")}
            disabled={isFemale}
          />
          <Toggle
            label={es.watchtowerReader}
            checked={values.watchtowerReader}
            onToggle={toggle("watchtowerReader")}
            disabled={isFemale}
          />
          {can("usher") && (
            <Toggle
              label={es.usher}
              checked={values.usher}
              onToggle={toggle("usher")}
              disabled={isFemale}
            />
          )}
          <Toggle
            label={es.ministerialServant}
            checked={values.ministerialServant}
            onToggle={toggle("ministerialServant")}
            disabled={isFemale}
          />
          <Toggle
            label={es.elder}
            checked={values.elder}
            onToggle={toggle("elder")}
            disabled={isFemale}
          />
        </Section>
      )}

      {!isFemale && showMeetings && (
        <Section title={es.midweekSection}>
          <Toggle
            label={es.midweekChairman}
            checked={values.midweekChairman}
            onToggle={toggle("midweekChairman")}
            disabled={isFemale}
          />
          <Toggle
            label={es.treasuresTalk}
            checked={values.treasuresTalk}
            onToggle={toggle("treasuresTalk")}
            disabled={isFemale}
          />
          <Toggle
            label={es.pearlsQuest}
            checked={values.pearlsQuest}
            onToggle={toggle("pearlsQuest")}
            disabled={isFemale}
          />
          <Toggle
            label={es.audienceAnalysis}
            checked={values.audienceAnalysis}
            onToggle={toggle("audienceAnalysis")}
            disabled={isFemale}
          />
          <Toggle
            label={es.analysisTalk}
            checked={values.analysisTalk}
            onToggle={toggle("analysisTalk")}
            disabled={isFemale}
          />
          <Toggle
            label={es.bibleStudy}
            checked={values.bibleStudy}
            onToggle={toggle("bibleStudy")}
            disabled={isFemale}
          />
        </Section>
      )}

      {!isFemale && showMeetings && (
        <Section title={es.weekendSection}>
          <Toggle
            label={es.publicChairman}
            checked={values.publicChairman}
            onToggle={toggle("publicChairman")}
            disabled={isFemale}
          />
          <Toggle
            label={es.publicTalk}
            checked={values.publicTalk}
            onToggle={toggle("publicTalk")}
            disabled={isFemale}
          />
          <Toggle
            label={es.watchtowerConductor}
            checked={values.watchtowerConductor}
            onToggle={toggle("watchtowerConductor")}
            disabled={isFemale}
          />
        </Section>
      )}

      <Section title={es.unavailable}>
        <Toggle
          label={es.unavailable}
          checked={values.unavailable}
          onToggle={toggle("unavailable")}
        />
        {values.unavailable && (
          <TextField
            id="unavailableNotes"
            label={es.unavailableNotes}
            value={values.unavailableNotes}
            placeholder={es.unavailableNotesPlaceholder}
            onChange={(value) => setField("unavailableNotes", value)}
          />
        )}
      </Section>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "…" : es.save}
      </Button>
    </form>
  );
}

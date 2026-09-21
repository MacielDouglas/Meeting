"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { FaTrash } from "react-icons/fa6";
import { createSpecialEvent, deleteSpecialEvent } from "@/features/settings/application/actions";
import type { SpecialEventItem } from "@/features/settings/application/queries";
import { SPECIAL_EVENT_TYPES } from "@/features/settings/domain/settings";
import { ChipSelect } from "@/features/settings/presentation/ChipSelect";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

const TYPE_OPTIONS = SPECIAL_EVENT_TYPES.map((item) => ({ value: item.value, label: item.label }));

function typeLabel(type: string): string {
  return SPECIAL_EVENT_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function SpecialEventSection({ events }: { events: SpecialEventItem[] }) {
  const router = useRouter();
  const [type, setType] = useState(TYPE_OPTIONS[0].value);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await createSpecialEvent({
        type,
        title,
        startDate,
        endDate: endDate === "" ? null : endDate,
        startTime,
        notes: notes === "" ? null : notes,
      });
      if (result.ok) {
        setTitle("");
        setStartDate("");
        setEndDate("");
        setNotes("");
        router.refresh();
      } else {
        setError(result.error ?? null);
      }
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(es.confirmDelete)) return;
    const result = await deleteSpecialEvent({ id });
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error ?? null);
    }
  }

  return (
    <Card className="flex flex-col gap-2">
      <CardTitle>{es.specialEvents}</CardTitle>
      {events.length === 0 ? (
        <CardDescription>{es.noSpecialEvents}</CardDescription>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-secondary px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {typeLabel(item.type)} · {item.startDate}
                  {item.endDate ? ` — ${item.endDate}` : ""} · {item.startTime}
                </p>
              </div>
              <button
                type="button"
                aria-label={es.delete}
                onClick={() => void handleDelete(item.id)}
                className="shrink-0 rounded-lg p-2 text-muted-foreground"
              >
                <FaTrash aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="pt-2 text-base font-semibold">{es.newEvent}</h3>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-2">
        <ChipSelect label={es.eventType} options={TYPE_OPTIONS} value={type} onChange={setType} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{es.eventTitle}</span>
          <input
            type="text"
            value={title}
            required
            maxLength={120}
            placeholder={es.eventTitlePlaceholder}
            onChange={(event) => setTitle(event.target.value)}
            className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none focus:border focus:border-ring"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{es.startDateLabel}</span>
          <input
            type="date"
            value={startDate}
            required
            onChange={(event) => setStartDate(event.target.value)}
            className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none focus:border focus:border-ring"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{es.endDateLabel}</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none focus:border focus:border-ring"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{es.eventStartTime}</span>
          <input
            type="time"
            value={startTime}
            required
            onChange={(event) => setStartTime(event.target.value)}
            className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none focus:border focus:border-ring"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{es.notesOptional}</span>
          <input
            type="text"
            value={notes}
            maxLength={500}
            placeholder={es.notesPlaceholder}
            onChange={(event) => setNotes(event.target.value)}
            className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none focus:border focus:border-ring"
          />
        </label>
        <Button type="submit" size="lg" disabled={pending}>
          {es.createEvent}
        </Button>
      </form>
    </Card>
  );
}

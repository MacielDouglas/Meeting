"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { FaTrash } from "react-icons/fa6";
import { createSpecialEvent, deleteSpecialEvent } from "@/features/settings/application/actions";
import type { SpecialEventItem } from "@/features/settings/application/queries";
import { SPECIAL_EVENT_TYPES } from "@/features/settings/domain/settings";
import { ChipSelect } from "@/features/settings/presentation/ChipSelect";
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
  const [speakerName, setSpeakerName] = useState("");
  const [midweekTheme, setMidweekTheme] = useState("");
  const [publicTalkTheme, setPublicTalkTheme] = useState("");
  const [finalTalkTheme, setFinalTalkTheme] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState<SpecialEventItem | null>(null);

  const isVisit = type === "circuit_visit";

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
        speakerName: isVisit && speakerName !== "" ? speakerName : null,
        midweekTheme: isVisit && midweekTheme !== "" ? midweekTheme : null,
        publicTalkTheme: isVisit && publicTalkTheme !== "" ? publicTalkTheme : null,
        finalTalkTheme: isVisit && finalTalkTheme !== "" ? finalTalkTheme : null,
      });
      if (result.ok) {
        setTitle("");
        setStartDate("");
        setEndDate("");
        setNotes("");
        setSpeakerName("");
        setMidweekTheme("");
        setPublicTalkTheme("");
        setFinalTalkTheme("");
        router.refresh();
      } else {
        setError(result.error ?? null);
      }
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const result = await deleteSpecialEvent({ id });
      if (result.ok) {
        setDeleting(null);
        router.refresh();
      } else {
        setError(result.error ?? null);
      }
    } catch (error) {
      if (isNextRedirectError(error)) throw error;
      setError(es.errorExcluir);
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
                <p title={item.title} className="truncate text-sm font-medium">
                  {item.title}
                </p>
                <p
                  title={`${typeLabel(item.type)} · ${item.startDate}${item.endDate ? ` — ${item.endDate}` : ""} · ${item.startTime}`}
                  className="truncate text-xs text-muted-foreground"
                >
                  {typeLabel(item.type)} · {item.startDate}
                  {item.endDate ? ` — ${item.endDate}` : ""} · {item.startTime}
                </p>
              </div>
              <button
                type="button"
                aria-label={`${es.delete}: ${item.title}`}
                onClick={() => setDeleting(item)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
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
        {isVisit && (
          <fieldset className="flex flex-col gap-2 rounded-xl border border-border p-3">
            <legend className="px-1 text-sm font-medium">{es.visitSectionTitle}</legend>
            <p className="-mt-1 text-xs text-muted-foreground">{es.visitFieldsHint}</p>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{es.visitSpeakerName}</span>
              <input
                type="text"
                value={speakerName}
                required
                maxLength={120}
                placeholder={es.visitSpeakerPlaceholder}
                onChange={(event) => setSpeakerName(event.target.value)}
                className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none focus:border focus:border-ring"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{es.visitMidweekTheme}</span>
              <input
                type="text"
                value={midweekTheme}
                required
                maxLength={200}
                placeholder={es.visitThemePlaceholder}
                onChange={(event) => setMidweekTheme(event.target.value)}
                className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none focus:border focus:border-ring"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{es.visitPublicTalkTheme}</span>
              <input
                type="text"
                value={publicTalkTheme}
                required
                maxLength={200}
                placeholder={es.visitThemePlaceholder}
                onChange={(event) => setPublicTalkTheme(event.target.value)}
                className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none focus:border focus:border-ring"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{es.visitFinalTalkTheme}</span>
              <input
                type="text"
                value={finalTalkTheme}
                required
                maxLength={200}
                placeholder={es.visitThemePlaceholder}
                onChange={(event) => setFinalTalkTheme(event.target.value)}
                className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none focus:border focus:border-ring"
              />
            </label>
          </fieldset>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          {es.createEvent}
        </Button>
      </form>
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{es.delete}</AlertDialogTitle>
            <AlertDialogDescription>{es.confirmDelete}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleting && <p className="truncate text-sm font-medium">{deleting.title}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>{es.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (deleting) void handleDelete(deleting.id);
              }}
            >
              {es.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

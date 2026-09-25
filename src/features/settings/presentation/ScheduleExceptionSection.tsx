"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { FaCalendarXmark, FaTrash } from "react-icons/fa6";
import {
  createScheduleException,
  deleteScheduleException,
} from "@/features/settings/application/actions";
import type { ScheduleExceptionItem } from "@/features/settings/application/queries";
import { SCHEDULE_EXCEPTION_TYPES } from "@/features/settings/domain/settings";
import { ChipSelect } from "@/features/settings/presentation/ChipSelect";
import { EmptyState } from "@/shared/components/EmptyState";
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
import { Card, CardTitle } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";
import { isNextRedirectError } from "@/shared/lib/redirect-error";

const TYPE_OPTIONS = SCHEDULE_EXCEPTION_TYPES.map((item) => ({
  value: item.value,
  label: item.label,
}));

function typeLabel(type: string): string {
  return SCHEDULE_EXCEPTION_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function ScheduleExceptionSection({ exceptions }: { exceptions: ScheduleExceptionItem[] }) {
  const router = useRouter();
  const [type, setType] = useState(TYPE_OPTIONS[0].value);
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState<ScheduleExceptionItem | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await createScheduleException({
        type,
        date,
        notes: notes === "" ? null : notes,
      });
      if (result.ok) {
        setDate("");
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
    setError(null);
    try {
      const result = await deleteScheduleException({ id });
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
      <CardTitle>{es.scheduleExceptions}</CardTitle>
      {exceptions.length === 0 ? (
        <EmptyState icon={<FaCalendarXmark aria-hidden size={22} />} title={es.noExceptions} />
      ) : (
        <ul className="flex flex-col gap-2">
          {exceptions.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-secondary px-3 py-2"
            >
              <div className="min-w-0">
                <p
                  title={`${typeLabel(item.type)} · ${item.date}`}
                  className="truncate text-sm font-medium"
                >
                  {typeLabel(item.type)} · {item.date}
                </p>
                {item.notes && (
                  <p title={item.notes} className="truncate text-xs text-muted-foreground">
                    {item.notes}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label={`${es.delete}: ${typeLabel(item.type)} ${item.date}`}
                onClick={() => setDeleting(item)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <FaTrash aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="pt-2 text-base font-semibold">{es.newException}</h3>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-2">
        <ChipSelect
          label={es.exceptionType}
          options={TYPE_OPTIONS}
          value={type}
          onChange={setType}
        />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{es.exceptionDate}</span>
          <input
            type="date"
            value={date}
            required
            onChange={(event) => setDate(event.target.value)}
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
          {es.createException}
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
          {deleting && (
            <p className="truncate text-sm font-medium">
              {typeLabel(deleting.type)} · {deleting.date}
            </p>
          )}
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

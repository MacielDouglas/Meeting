"use client";

import { useState } from "react";
import { FaTrashAlt } from "react-icons/fa";
import type { AnyInspectResult } from "@/features/meeting-content/application/actions";
import {
  deleteWorkbookIssue,
  saveWorkbookIssue,
} from "@/features/meeting-content/application/workbook-actions";
import type { WorkbookIssueItem } from "@/features/meeting-content/application/workbook-queries";
import type {
  WorkbookContentMeeting,
  WorkbookContentPart,
  WorkbookContentWeek,
} from "@/features/meeting-content/infrastructure/workbook-parser";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { es } from "@/shared/i18n/es";
import { isNextRedirectError } from "@/shared/lib/redirect-error";

const SECTION_LABELS: Record<string, string> = {
  "TREASURES FROM GODS WORD": "Tesoros de la Palabra de Dios",
  "APPLY YOURSELF TO THE FIELD MINISTRY": "Ministerio del Campo",
  "LIVING AS CHRISTIANS": "Vida Cristiana",
};

function SongText({ text, theme }: { text: string | undefined; theme: string | null }) {
  if (!text) return null;
  return (
    <span>
      {text}
      {theme ? ` — ${theme}` : ""}
    </span>
  );
}

function PartCard({ part }: { part: WorkbookContentPart }) {
  return (
    <div className="rounded-lg bg-secondary px-3 py-2 text-sm">
      <p className="text-xs font-medium text-foreground">
        {part.number}. {part.title}
        {part.duration ? ` ${part.duration}` : ""}
      </p>
      {part.format && <p className="text-xs text-muted-foreground">{part.format}</p>}
      {part.territory && <p className="text-xs text-muted-foreground">{part.territory}</p>}
      {part.assignment && <p className="text-xs text-muted-foreground">{part.assignment}</p>}
      {typeof part.content === "string" && part.content && (
        <p className="text-xs text-muted-foreground">{part.content}</p>
      )}
      {Array.isArray(part.content) && part.content.length > 0 && (
        <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
          {part.content.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MeetingSections({ meeting }: { meeting: WorkbookContentMeeting }) {
  const sections = [
    "TREASURES FROM GODS WORD",
    "APPLY YOURSELF TO THE FIELD MINISTRY",
    "LIVING AS CHRISTIANS",
  ] as const;
  return (
    <div className="flex flex-col gap-2">
      {sections.map((key) => {
        const parts = meeting[key];
        if (!parts || parts.length === 0) return null;
        return (
          <div key={key} className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-muted-foreground">{SECTION_LABELS[key]}</p>
            {parts.map((part) => (
              <PartCard key={`${key}-${part.number}`} part={part} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function WorkbookImportModal({
  inspected,
  onClose,
  onSaved,
}: {
  inspected: Extract<AnyInspectResult, { ok: true; kind: "workbook" }>;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const weeks = inspected.weeks ?? [];
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      const content = JSON.stringify({ name: inspected.name, weeks });
      const result = await saveWorkbookIssue({
        symbol: inspected.symbol,
        name: inspected.name,
        language: inspected.language,
        source: inspected.source,
        content,
      });
      if (result.ok) {
        onSaved(`Edición ${inspected.symbol} guardada con ${weeks.length} semanas.`);
        onClose();
      } else {
        setSaveError(result.error ?? es.errorGuardar);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {inspected.symbol} · {inspected.name}
          </DialogTitle>
          <DialogDescription>{weeks.length} semanas</DialogDescription>
        </DialogHeader>
        {inspected.hadExisting ? (
          <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning-on-soft">
            Este contenido ({inspected.symbol}, {weeks.length} semanas) {es.yaExisteSubstituir}.{" "}
            {es.deseaSubstituir}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {weeks.map((week) => (
              <li key={week.week} className="rounded-lg bg-secondary px-3 py-2 text-sm">
                <p className="text-xs font-medium text-muted-foreground">{week.week}</p>
                <p className="font-semibold">{week.meeting?.BibleReading ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {week.meeting?.song?.[0]?.openingSong ?? "—"} →{" "}
                  {week.meeting?.song?.[0]?.middleSong ?? "—"} →{" "}
                  {week.meeting?.song?.[0]?.closingSong ?? "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
        {saveError && (
          <p role="alert" className="text-sm text-danger">
            {saveError}
          </p>
        )}
        <DialogFooter className="flex-col sm:flex-row">
          <Button disabled={saving} onClick={() => void handleSave()}>
            {saving ? es.guardando : inspected.hadExisting ? "Reemplazar" : es.save}
          </Button>
          <DialogClose>{es.cancel}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WeekDetailModal({ week, onClose }: { week: WorkbookContentWeek; onClose: () => void }) {
  const meeting = week.meeting ?? ({} as WorkbookContentMeeting);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{week.week}</DialogTitle>
          <DialogDescription>{meeting.BibleReading ?? "Sin lectura semanal"}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="rounded-lg bg-secondary px-3 py-2 text-sm">
            <p className="text-xs font-medium text-muted-foreground">{es.canticos}</p>
            <p>
              Inicial: <SongText text={meeting.song?.[0]?.openingSong} theme={null} />
            </p>
            <p>
              Intermedia: <SongText text={meeting.song?.[0]?.middleSong} theme={null} />
            </p>
            <p>
              Final: <SongText text={meeting.song?.[0]?.closingSong} theme={null} />
            </p>
          </div>
          {meeting.openingComments && (
            <div className="rounded-lg bg-secondary px-3 py-2 text-sm">
              <p className="text-xs font-medium text-muted-foreground">Palabras de introducción</p>
              <p>{meeting.openingComments}</p>
            </div>
          )}
          <MeetingSections meeting={meeting} />
          {meeting.concludingComments && (
            <div className="rounded-lg bg-secondary px-3 py-2 text-sm">
              <p className="text-xs font-medium text-muted-foreground">Palabras de conclusión</p>
              <p>{meeting.concludingComments}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose>{es.cancel}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WorkbookSection({
  initial,
  canManage,
}: {
  initial: WorkbookIssueItem[];
  canManage: boolean;
}) {
  const [selectedWeek, setSelectedWeek] = useState<{
    issue: WorkbookIssueItem;
    week: WorkbookContentWeek;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkbookIssueItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteIssue() {
    if (!deleteTarget || deleting) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const result = await deleteWorkbookIssue({ id: deleteTarget.id });
      if (result.ok) {
        setDeleteTarget(null);
      } else {
        setDeleteError(result.error ?? es.errorExcluir);
      }
    } catch (error) {
      if (isNextRedirectError(error)) throw error;
      setDeleteError(es.errorExcluir);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {initial.length === 0 && (
        <Card className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            Todavía no hay ediciones importadas. Usa “Importar .jwpub” para añadir la Guía.
          </p>
        </Card>
      )}
      {initial.map((issue) => (
        <Card key={issue.id} className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold">{issue.symbol}</p>
              <p className="text-sm text-muted-foreground">{issue.name}</p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => setDeleteTarget(issue)}
                aria-label={`${es.eliminar} la edición ${issue.symbol}`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-danger transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <FaTrashAlt aria-hidden size={18} />
              </button>
            )}
          </div>
          <ul className="flex flex-col gap-2">
            {(issue.weeks ?? []).map((week) => (
              <li key={week.week}>
                <button
                  type="button"
                  onClick={() => setSelectedWeek({ issue, week })}
                  className="block w-full rounded-xl bg-secondary p-3 text-left"
                >
                  <p className="text-xs font-medium text-muted-foreground">{week.week}</p>
                  <p className="text-sm font-semibold">{week.meeting?.BibleReading ?? "—"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {week.meeting?.song?.[0]?.openingSong ?? "—"} →{" "}
                    {week.meeting?.song?.[0]?.middleSong ?? "—"} →{" "}
                    {week.meeting?.song?.[0]?.closingSong ?? "—"}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
      {selectedWeek && (
        <WeekDetailModal week={selectedWeek.week} onClose={() => setSelectedWeek(null)} />
      )}
      {deleteTarget && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !deleting) {
              setDeleteTarget(null);
              setDeleteError(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {es.eliminar} la edición {deleteTarget.symbol}
              </DialogTitle>
              <DialogDescription>
                ¿Eliminar {deleteTarget.symbol} ({deleteTarget.name})? Las semanas y las partes se
                eliminarán también. Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row">
              {deleteError && (
                <p role="alert" className="text-sm text-danger">
                  {deleteError}
                </p>
              )}
              <Button
                className="border-transparent bg-danger text-danger-ink"
                disabled={deleting}
                onClick={() => void handleDeleteIssue()}
              >
                {deleting ? es.guardando : es.confirmarExclusion}
              </Button>
              <DialogClose disabled={deleting}>{es.cancel}</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

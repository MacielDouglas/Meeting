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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

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
      <p className="text-xs font-medium text-accent">
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
            <p className="text-xs font-semibold text-accent">{SECTION_LABELS[key]}</p>
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
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {inspected.symbol} · {inspected.name}
          </AlertDialogTitle>
          <AlertDialogDescription>{weeks.length} semanas</AlertDialogDescription>
        </AlertDialogHeader>
        {inspected.hadExisting ? (
          <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">
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
        {saveError && <p className="text-sm text-danger">{saveError}</p>}
        <AlertDialogFooter className="flex-col sm:flex-row">
          <Button disabled={saving} onClick={() => void handleSave()}>
            {saving ? es.guardando : inspected.hadExisting ? "Reemplazar" : es.save}
          </Button>
          <AlertDialogCancel>{es.cancel}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function WeekDetailModal({ week, onClose }: { week: WorkbookContentWeek; onClose: () => void }) {
  const meeting = week.meeting ?? ({} as WorkbookContentMeeting);
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{week.week}</AlertDialogTitle>
          <AlertDialogDescription>
            {meeting.BibleReading ?? "Sin lectura semanal"}
          </AlertDialogDescription>
        </AlertDialogHeader>
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
        <AlertDialogFooter>
          <AlertDialogCancel>{es.cancel}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
                className="rounded-lg p-2 text-danger"
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
                  <p className="text-xs font-medium text-accent">{week.week}</p>
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
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {es.eliminar} la edición {deleteTarget.symbol}
              </AlertDialogTitle>
              <AlertDialogDescription>
                ¿Eliminar {deleteTarget.symbol} ({deleteTarget.name})? Las semanas y las partes se
                eliminarán también. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row">
              <Button
                className="border-transparent bg-danger text-danger-ink"
                onClick={() => {
                  void deleteWorkbookIssue({ id: deleteTarget.id }).then(() =>
                    setDeleteTarget(null),
                  );
                }}
              >
                {es.confirmarExclusion}
              </Button>
              <AlertDialogCancel>{es.cancel}</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

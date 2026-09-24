"use client";

import { useState } from "react";
import { FaArchive, FaCheck, FaPen, FaTrash } from "react-icons/fa";
import {
  deleteCleaningDay,
  deleteCleaningProgram,
  updateProgramStatus,
} from "@/features/cleaning/application/cleaning-program-actions";
import type {
  CleaningAssignmentItem,
  CleaningProgramItem,
} from "@/features/cleaning/application/cleaning-program-queries";
import { getSectorIcon } from "@/features/cleaning/domain/cleaning-sector-icons";
import { Button } from "@/shared/components/ui/button";
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
import { DownloadCleaningPdfButton } from "./DownloadCleaningPdfButton-client";
import { PersonSelectModal } from "./PersonSelectModal";

interface ProgramDetailProps {
  program: CleaningProgramItem;
  assignments: CleaningAssignmentItem[];
  typeKey: string;
  sectors?: { key: string | null; id: string; requiredSex: string; allowYoung: boolean }[];
  congregationName?: string;
  /** Tarefas por sectorKey (da config de limpeza). */
  sectorTasks?: Record<string, string>;
  onClose: () => void;
  onDeleted: () => void;
  onRefresh: () => void;
}

interface Message {
  date: string;
  message: string;
}

export function ProgramDetail({
  program,
  assignments,
  typeKey,
  sectors = [],
  congregationName = "",
  sectorTasks = {},
  onClose,
  onDeleted,
  onRefresh,
}: ProgramDetailProps) {
  const [editingAssignment, setEditingAssignment] = useState<CleaningAssignmentItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingDay, setDeletingDay] = useState<string | null>(null);
  const [dayError, setDayError] = useState<string | null>(null);

  // Edição liberada em qualquer status, inclusive arquivado.
  const canEdit = true;

  const grouped = new Map<string, CleaningAssignmentItem[]>();
  for (const a of assignments) {
    if (!grouped.has(a.assignmentDate)) grouped.set(a.assignmentDate, []);
    grouped.get(a.assignmentDate)?.push(a);
  }

  const sortedDates = [...grouped.keys()].sort();

  const messages: Message[] = [];
  if (assignments.length > 0) {
    const firstDate = sortedDates[0] ?? program.startDate;
    const lastDate = sortedDates[sortedDates.length - 1] ?? program.endDate;
    const current = new Date(`${firstDate}T00:00:00Z`);
    const end = new Date(`${lastDate}T00:00:00Z`);
    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      if (!grouped.has(dateStr)) {
        const dayOfWeek = current.getUTCDay();
        if (dayOfWeek === 2 || dayOfWeek === 0) {
          messages.push({ date: dateStr, message: "Sin limpieza programada" });
        }
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteCleaningProgram(program.id);
    if (result.ok) {
      onDeleted();
      onClose();
    }
    setDeleting(false);
  }

  async function handleStatusChange(status: "confirmed" | "archived") {
    await updateProgramStatus(program.id, status);
    onRefresh();
  }

  async function handleDeleteDay(date: string) {
    setDeletingDay(date);
    setDayError(null);
    const result = await deleteCleaningDay(program.id, date);
    if (result.ok) {
      onRefresh();
    } else {
      setDayError(result.error ?? "No se pudo eliminar el día. Inténtalo de nuevo.");
    }
    setDeletingDay(null);
  }

  const dayUsedPersonIds = editingAssignment
    ? assignments
        .filter(
          (a) =>
            a.assignmentDate === editingAssignment.assignmentDate && a.id !== editingAssignment.id,
        )
        .map((a) => a.personId)
        .filter((id): id is string => id !== null)
    : [];

  const editingSectorRule = editingAssignment
    ? sectors.find(
        (s) =>
          (s.key ?? s.id) === editingAssignment.sectorKey || s.id === editingAssignment.sectorKey,
      )
    : null;

  return (
    <div className="flex flex-col gap-3">
      <DownloadCleaningPdfButton
        congregationName={congregationName}
        periodFrom={program.startDate}
        periodTo={program.endDate}
        assignments={assignments.map((assignment) => ({
          assignmentDate: assignment.assignmentDate,
          sectorKey: assignment.sectorKey,
          sectorName: assignment.sectorName,
          personName: assignment.personName || es.sinAsignar,
          sortOrder: assignment.sortOrder,
        }))}
        sectorTasks={sectorTasks}
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">
            {program.startDate} — {program.endDate}
          </p>
          <p className="text-xs text-muted-foreground">
            {assignments.length} {es.designacionesLabel} ·{" "}
            <span
              className={
                program.status === "confirmed"
                  ? "text-success"
                  : program.status === "archived"
                    ? "text-muted-foreground"
                    : "text-warning"
              }
            >
              {program.status === "draft"
                ? es.borrador
                : program.status === "confirmed"
                  ? es.confirmado
                  : es.archivado}
            </span>
          </p>
        </div>
        <div className="flex gap-1">
          {program.status === "draft" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleStatusChange("confirmed")}
              title="Confirmar programa"
              aria-label="Confirmar programa"
            >
              <FaCheck size={12} />
            </Button>
          )}
          {program.status !== "archived" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleStatusChange("archived")}
              title="Archivar programa"
              aria-label="Archivar programa"
            >
              <FaArchive size={12} />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleStatusChange("confirmed")}
              title="Reabrir programa archivado"
              aria-label="Reabrir programa archivado"
            >
              <FaCheck size={12} />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-danger"
            onClick={() => setConfirmDelete(true)}
            title="Eliminar programa"
            aria-label="Eliminar programa"
          >
            <FaTrash size={12} />
          </Button>
        </div>
      </div>

      {dayError && (
        <p role="alert" className="text-sm text-danger">
          {dayError}
        </p>
      )}
      {sortedDates.map((date) => {
        const dayAssignments = grouped.get(date) ?? [];
        return (
          <div key={date} className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">{date}</p>
              {canEdit && (
                <button
                  type="button"
                  disabled={deletingDay === date}
                  onClick={() => void handleDeleteDay(date)}
                  className="text-xs text-danger hover:underline disabled:opacity-50"
                  title={`Eliminar el día ${date}`}
                >
                  {deletingDay === date ? "Eliminando…" : "Eliminar día"}
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {dayAssignments.map((assignment) => {
                const Icon = getSectorIcon(typeKey, assignment.sectorKey);
                return (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-2 rounded-lg bg-secondary px-2 py-1.5 text-sm"
                  >
                    <Icon size={16} className="shrink-0 text-accent" />
                    <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">
                      {assignment.sectorName}
                    </span>
                    <span className="flex-1 truncate">
                      {assignment.personName || (
                        <em className="text-muted-foreground">Sin designación</em>
                      )}
                      {assignment.isFamily && (
                        <span className="ml-1 text-xs text-warning">(familia)</span>
                      )}
                    </span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setEditingAssignment(assignment)}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        title="Cambiar persona"
                        aria-label={`Cambiar persona en ${assignment.sectorName}`}
                      >
                        <FaPen size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {messages.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning-soft p-3">
          <p className="mb-1 text-xs font-semibold text-warning">Observaciones</p>
          {messages.map((msg) => (
            <p key={msg.date} className="text-xs text-warning">
              {msg.date}: {msg.message}
            </p>
          ))}
        </div>
      )}

      {editingAssignment && (
        <PersonSelectModal
          assignmentId={editingAssignment.id}
          sectorKey={editingAssignment.sectorKey}
          sectorName={editingAssignment.sectorName}
          typeKey={typeKey}
          currentPersonId={editingAssignment.personId}
          currentPersonName={editingAssignment.personName}
          requiredSex={(editingSectorRule?.requiredSex ?? "any") as "any" | "male" | "female"}
          allowYoung={editingSectorRule?.allowYoung ?? true}
          dayUsedPersonIds={dayUsedPersonIds}
          onClose={() => setEditingAssignment(null)}
          onUpdated={onRefresh}
        />
      )}

      {confirmDelete && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirmDelete(false);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar programa</DialogTitle>
              <DialogDescription>
                ¿Eliminar este programa y las {assignments.length} {es.designacionesLabel}? Esta
                acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose disabled={deleting}>{es.cancel}</DialogClose>
              <Button
                className="bg-danger text-danger-ink"
                disabled={deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? "Eliminando…" : es.eliminar}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

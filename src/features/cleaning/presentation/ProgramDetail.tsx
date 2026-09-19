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
import { PersonSelectModal } from "./PersonSelectModal";

interface ProgramDetailProps {
  program: CleaningProgramItem;
  assignments: CleaningAssignmentItem[];
  typeKey: string;
  sectors?: { key: string | null; id: string; requiredSex: string; allowYoung: boolean }[];
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
          messages.push({ date: dateStr, message: "Sem limpeza programada" });
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
      setDayError(result.error ?? "Não foi possível excluir o dia.");
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">
            {program.startDate} — {program.endDate}
          </p>
          <p className="text-xs text-muted-foreground">
            {assignments.length} designações ·{" "}
            <span
              className={
                program.status === "confirmed"
                  ? "text-emerald-500"
                  : program.status === "archived"
                    ? "text-muted-foreground"
                    : "text-amber-500"
              }
            >
              {program.status === "draft"
                ? "Rascunho"
                : program.status === "confirmed"
                  ? "Confirmado"
                  : "Arquivado"}
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
            >
              <FaCheck size={12} />
            </Button>
          )}
          {program.status !== "archived" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleStatusChange("archived")}
              title="Arquivar programa"
            >
              <FaArchive size={12} />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleStatusChange("confirmed")}
              title="Reabrir programa arquivado"
            >
              <FaCheck size={12} />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-red-500"
            onClick={() => setConfirmDelete(true)}
            title="Excluir programa"
          >
            <FaTrash size={12} />
          </Button>
        </div>
      </div>

      {dayError && (
        <p role="alert" className="text-sm text-red-500">
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
                  className="text-xs text-red-500 hover:underline disabled:opacity-50"
                  title={`Excluir dia ${date}`}
                >
                  {deletingDay === date ? "Excluindo…" : "Excluir dia"}
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
                    <Icon size={16} className="shrink-0 text-sky-500" />
                    <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">
                      {assignment.sectorName}
                    </span>
                    <span className="flex-1 truncate">
                      {assignment.personName || (
                        <em className="text-muted-foreground">Sem designação</em>
                      )}
                      {assignment.isFamily && (
                        <span className="ml-1 text-xs text-amber-500">(família)</span>
                      )}
                    </span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setEditingAssignment(assignment)}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        title="Alterar pessoa"
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="mb-1 text-xs font-semibold text-amber-700">Observações</p>
          {messages.map((msg) => (
            <p key={msg.date} className="text-xs text-amber-600">
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
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirmDelete(false);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir programa</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja excluir este programa e todas as {assignments.length} designações? Esta ação
                não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <Button
                className="bg-red-500 text-white"
                disabled={deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

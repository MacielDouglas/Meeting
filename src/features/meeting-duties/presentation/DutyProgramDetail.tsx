"use client";

import { useState } from "react";
import {
  deleteDutyProgram,
  updateDutyAssignment,
  updateDutyProgramStatus,
} from "@/features/meeting-duties/application/duty-actions";
import {
  type DutyAssignmentItem,
  type DutyProgramItem,
  listDutyCandidates,
} from "@/features/meeting-duties/application/duty-queries";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";
import { DownloadDutyPdfButton } from "./DownloadDutyPdfButton-client";
import { DutyKeyIcon } from "./DutyKeyIcon";

interface DutyProgramDetailProps {
  program: DutyProgramItem;
  assignments: DutyAssignmentItem[];
  congregationName?: string;
  onClose: () => void;
  onDeleted: () => void;
  onRefresh: () => void;
}

function kindLabel(kind: string): string {
  return kind === "weekend" ? es.finSemana : es.entreSemana;
}

function AssignmentRow({
  assignment,
  onChanged,
}: {
  assignment: DutyAssignmentItem;
  onChanged: () => void;
}) {
  const [candidates, setCandidates] = useState<{ id: string; name: string }[] | null>(null);
  const [saving, setSaving] = useState(false);

  async function ensureCandidates() {
    if (candidates !== null) return;
    const list = await listDutyCandidates(
      assignment.dutyKey as "usher" | "sound" | "video" | "microphone" | "platform",
    );
    setCandidates(list);
  }

  async function handleChange(personId: string | null) {
    setSaving(true);
    await updateDutyAssignment(assignment.id, personId);
    setSaving(false);
    onChanged();
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-secondary px-2 py-1.5 text-sm">
      <DutyKeyIcon dutyKey={assignment.dutyKey} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          {assignment.postLabel || assignment.dutyKey}
          {assignment.side ? (
            <span className="font-normal text-muted-foreground"> · {assignment.side}</span>
          ) : null}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {assignment.personName || es.sinAsignar}
          {assignment.isManual ? " · manual" : ""}
        </span>
      </span>
      <select
        aria-label={`${assignment.postLabel || assignment.dutyKey}`}
        disabled={saving}
        value={assignment.personId ?? ""}
        onFocus={() => void ensureCandidates()}
        onChange={(e) => void handleChange(e.target.value === "" ? null : e.target.value)}
        className="h-9 max-w-36 rounded-lg border border-input bg-background px-1 text-xs outline-none focus:border-ring disabled:opacity-50"
      >
        <option value="">{es.vacante}</option>
        {(candidates ?? []).map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        {assignment.personId && !(candidates ?? []).some((c) => c.id === assignment.personId) && (
          <option value={assignment.personId}>{assignment.personName}</option>
        )}
      </select>
    </div>
  );
}

export function DutyProgramDetail({
  program,
  assignments,
  congregationName = "",
  onClose,
  onDeleted,
  onRefresh,
}: DutyProgramDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const grouped = new Map<string, DutyAssignmentItem[]>();
  for (const a of assignments) {
    const list = grouped.get(a.assignmentDate) ?? [];
    list.push(a);
    grouped.set(a.assignmentDate, list);
  }
  const sortedDates = [...grouped.keys()].sort();

  async function handleStatus(status: "draft" | "confirmed" | "archived") {
    setBusy(true);
    await updateDutyProgramStatus(program.id, status);
    setBusy(false);
    onRefresh();
  }

  async function handleDelete() {
    setBusy(true);
    const result = await deleteDutyProgram(program.id);
    setBusy(false);
    if (result.ok) {
      onDeleted();
      onClose();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <DownloadDutyPdfButton
        congregationName={congregationName}
        periodFrom={program.startDate}
        periodTo={program.endDate}
        days={sortedDates.map((date) => ({
          date,
          slots: (grouped.get(date) ?? []).map((assignment) => ({
            dutyKey: assignment.dutyKey,
            dutyName: assignment.dutyName,
            side: assignment.side,
            personName: assignment.personName || es.vacante,
          })),
        }))}
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
              disabled={busy}
              onClick={() => void handleStatus("confirmed")}
            >
              {es.confirmarEscala}
            </Button>
          )}
          {program.status !== "archived" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void handleStatus("archived")}
            >
              {es.archivar}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void handleStatus("confirmed")}
            >
              {es.reabrir}
            </Button>
          )}
        </div>
      </div>

      {sortedDates.map((date) => {
        const dayAssignments = grouped.get(date) ?? [];
        const kind = dayAssignments[0]?.meetingKind ?? "";
        return (
          <div key={date} className="rounded-lg border p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              {date} · {kindLabel(kind)}
            </p>
            <div className="flex flex-col gap-1">
              {dayAssignments.map((assignment) => (
                <AssignmentRow key={assignment.id} assignment={assignment} onChanged={onRefresh} />
              ))}
            </div>
          </div>
        );
      })}

      <Button variant="outline" onClick={onClose}>
        ← {es.volverLista}
      </Button>
      {confirmDelete ? (
        <Card className="flex flex-col gap-2 border-danger/30">
          <p className="text-sm">{es.confirmDelete}</p>
          <div className="flex gap-2">
            <Button
              disabled={busy}
              onClick={() => void handleDelete()}
              className="border-transparent bg-danger text-danger-ink"
            >
              {es.confirmarExclusion}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setConfirmDelete(false)}>
              {es.volver}
            </Button>
          </div>
        </Card>
      ) : (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => setConfirmDelete(true)}
          className="text-danger"
        >
          {es.eliminarEscala}
        </Button>
      )}
    </div>
  );
}

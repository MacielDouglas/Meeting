"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  type DutyDraftDate,
  generateDutyRoster,
  saveDutyProgram,
} from "@/features/meeting-duties/application/duty-actions";
import {
  type DutyAssignmentItem,
  type DutyProgramItem,
  getDutyProgramDetail,
  listDutyPrograms,
} from "@/features/meeting-duties/application/duty-queries";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";
import { isNextRedirectError } from "@/shared/lib/redirect-error";
import { DownloadDutyPdfButton } from "./DownloadDutyPdfButton-client";
import { DutyKeyIcon } from "./DutyKeyIcon";
import { DutyProgramDetail } from "./DutyProgramDetail";

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mondayOfCurrentWeek(): string {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const diff = (now.getDay() + 6) % 7;
  now.setDate(now.getDate() - diff);
  return toISODate(now);
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 12);
  dt.setDate(dt.getDate() + days);
  return toISODate(dt);
}

function kindLabel(kind: string): string {
  return kind === "weekend" ? es.finSemana : es.entreSemana;
}

export function DutySection({ congregationName = "" }: { congregationName?: string }) {
  const defaultStart = useMemo(() => mondayOfCurrentWeek(), []);
  const [rangeStart, setRangeStart] = useState(defaultStart);
  const [rangeEnd, setRangeEnd] = useState(() => addDaysISO(mondayOfCurrentWeek(), 27));

  const [draft, setDraft] = useState<DutyDraftDate[] | null>(null);
  const [editedSlots, setEditedSlots] = useState<Set<string>>(new Set());
  const [missingDates, setMissingDates] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [viewingProgram, setViewingProgram] = useState<{
    program: DutyProgramItem;
    assignments: DutyAssignmentItem[];
  } | null>(null);

  const {
    data: programs = [],
    refetch: refetchPrograms,
    isError: programsError,
  } = useQuery({
    queryKey: ["duty-programs"],
    queryFn: () => listDutyPrograms(),
    staleTime: 0,
    placeholderData: (previousData) => previousData,
  });

  const activePrograms = useMemo(() => programs.filter((p) => p.status !== "archived"), [programs]);

  const programDates = useMemo(() => {
    const set = new Set<string>();
    for (const p of activePrograms) {
      const current = new Date(`${p.startDate}T00:00:00Z`);
      const end = new Date(`${p.endDate}T00:00:00Z`);
      while (current <= end) {
        set.add(current.toISOString().slice(0, 10));
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }
    return set;
  }, [activePrograms]);

  const draftDates = useMemo(() => (draft ?? []).map((d) => d.date), [draft]);
  const draftPdfDays = useMemo(
    () =>
      (draft ?? []).map((day) => ({
        date: day.date,
        slots: day.slots.map((slot) => ({
          dutyKey: slot.dutyKey,
          dutyName: slot.dutyName,
          side: slot.side,
          personName:
            slot.candidates.find((candidate) => candidate.id === slot.personId)?.name ??
            es.sinAsignar,
        })),
      })),
    [draft],
  );
  const overlapDates = useMemo(
    () => draftDates.filter((d) => programDates.has(d)),
    [draftDates, programDates],
  );

  function slotKey(date: string, dutyKey: string, postLabel: string): string {
    return `${date}|${dutyKey}|${postLabel}`;
  }

  async function handleGenerate() {
    setGenerating(true);
    setErrorMsg(null);
    setStatusMsg(null);
    setMissingDates([]);
    try {
      const result = await generateDutyRoster(rangeStart, rangeEnd);
      if (!result.ok || !result.draft) {
        setErrorMsg(result.error ?? es.errorGuardar);
        setDraft(null);
        return;
      }
      setDraft(result.draft);
      setEditedSlots(new Set());
      setMissingDates(result.programMissingDates ?? []);
    } finally {
      setGenerating(false);
    }
  }

  function handleSlotChange(
    date: string,
    dutyKey: string,
    postLabel: string,
    personId: string | null,
  ) {
    setDraft((previous) =>
      (previous ?? []).map((day) =>
        day.date !== date
          ? day
          : {
              ...day,
              slots: day.slots.map((slot) =>
                slot.dutyKey === dutyKey && slot.postLabel === postLabel
                  ? { ...slot, personId }
                  : slot,
              ),
            },
      ),
    );
    setEditedSlots((previous) => new Set(previous).add(slotKey(date, dutyKey, postLabel)));
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const result = await saveDutyProgram(
        draft.map((day) => ({
          date: day.date,
          kind: day.kind,
          slots: day.slots.map((slot) => ({
            dutyKey: slot.dutyKey,
            postLabel: slot.postLabel,
            side: slot.side,
            personId: slot.personId,
            isManual: editedSlots.has(slotKey(day.date, slot.dutyKey, slot.postLabel)),
          })),
        })),
      );
      if (!result.ok) {
        setErrorMsg(result.error ?? es.errorGuardar);
        return;
      }
      setStatusMsg(`${es.escalaCreada} (${result.assignmentCount ?? 0} ${es.designacionesLabel}).`);
      setDraft(null);
      setEditedSlots(new Set());
      setMissingDates([]);
      await refetchPrograms();
    } finally {
      setSaving(false);
    }
  }

  async function handleViewProgram(program: DutyProgramItem) {
    setErrorMsg(null);
    try {
      const detail = await getDutyProgramDetail(program.id);
      setViewingProgram(detail);
    } catch (error) {
      if (isNextRedirectError(error)) throw error;
      setErrorMsg(es.errorCargarLista);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {viewingProgram ? (
        <div className="flex flex-col gap-3">
          <DutyProgramDetail
            program={viewingProgram.program}
            assignments={viewingProgram.assignments}
            congregationName={congregationName}
            onClose={() => setViewingProgram(null)}
            onDeleted={() => {
              setViewingProgram(null);
              void refetchPrograms();
            }}
            onRefresh={async () => {
              const detail = await getDutyProgramDetail(viewingProgram.program.id);
              setViewingProgram(detail);
              await refetchPrograms();
            }}
          />
        </div>
      ) : (
        <>
          <Card className="flex flex-col gap-3 p-4">
            <p className="text-sm font-medium">{es.periodoEscala}</p>
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs text-muted-foreground">{es.fechaInicio}</span>
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="h-9 rounded-lg border bg-background px-2 text-sm"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs text-muted-foreground">{es.fechaFinal}</span>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="h-9 rounded-lg border bg-background px-2 text-sm"
                />
              </label>
            </div>
            <Button
              disabled={generating || !rangeStart || !rangeEnd}
              onClick={() => void handleGenerate()}
            >
              {generating ? es.generandoEscala : es.generarEscala}
            </Button>
          </Card>

          {errorMsg && (
            <p role="alert" className="text-sm text-danger">
              {errorMsg}
            </p>
          )}
          {statusMsg && (
            <p role="status" className="text-sm text-success">
              {statusMsg}
            </p>
          )}
          {missingDates.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning-soft p-3">
              <p className="mb-1 text-xs font-semibold text-warning-on-soft">
                {es.diasSinPrograma}
              </p>
              <p className="text-xs text-warning-on-soft">{missingDates.join(", ")}</p>
            </div>
          )}

          {draft && (
            <div className="flex flex-col gap-3">
              {overlapDates.length > 0 && (
                <div
                  role="alert"
                  className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger-on-soft"
                >
                  {overlapDates.sort()[0]}: {es.tablaDuplicada}
                </div>
              )}
              {draft.map((day) => (
                <div key={`${day.date}-${day.kind}`} className="rounded-lg border p-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    {day.date} · {kindLabel(day.kind)}
                  </p>
                  {day.programConflictNames.length > 0 && (
                    <p className="mb-2 text-xs text-muted-foreground">
                      {es.enElPrograma}: {day.programConflictNames.slice(0, 6).join(", ")}
                      {day.programConflictNames.length > 6 ? "…" : ""}
                    </p>
                  )}
                  <div className="flex flex-col gap-1">
                    {day.slots.map((slot) => {
                      const key = slotKey(day.date, slot.dutyKey, slot.postLabel);
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-2 rounded-lg bg-secondary px-2 py-1.5 text-sm"
                        >
                          <DutyKeyIcon dutyKey={slot.dutyKey} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {slot.postLabel}
                              {slot.side ? (
                                <span className="font-normal text-muted-foreground">
                                  {" "}
                                  · {slot.side}
                                </span>
                              ) : null}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {slot.dutyName}
                              {editedSlots.has(key) ? ` · ${es.manual}` : ""}
                            </span>
                          </span>
                          <select
                            aria-label={`${day.date} · ${slot.postLabel}`}
                            value={slot.personId ?? ""}
                            onChange={(e) =>
                              handleSlotChange(
                                day.date,
                                slot.dutyKey,
                                slot.postLabel,
                                e.target.value === "" ? null : e.target.value,
                              )
                            }
                            className="h-9 max-w-36 rounded-lg border border-input bg-background px-1 text-xs outline-none focus:border-ring"
                          >
                            <option value="">{es.sinAsignar}</option>
                            {slot.candidates.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                                {slot.conflictIds.includes(c.id)
                                  ? ` · ${es.enElProgramaMinuscula}`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Button
                  disabled={saving || overlapDates.length > 0}
                  onClick={() => void handleSave()}
                  className="flex-1"
                >
                  {saving ? es.guardando : es.guardarEscala}
                </Button>
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => {
                    setDraft(null);
                    setEditedSlots(new Set());
                    setMissingDates([]);
                  }}
                  className="flex-1"
                >
                  {es.descartar}
                </Button>
              </div>
              <DownloadDutyPdfButton
                congregationName={congregationName}
                periodFrom={draft[0]?.date ?? rangeStart}
                periodTo={draft[draft.length - 1]?.date ?? rangeEnd}
                days={draftPdfDays}
              />
            </div>
          )}

          {programsError && programs.length === 0 && (
            <Card className="flex flex-col gap-3">
              <p role="alert" className="text-sm text-danger">
                {es.errorCargarLista}
              </p>
              <div>
                <Button size="sm" variant="outline" onClick={() => void refetchPrograms()}>
                  {es.reintentar}
                </Button>
              </div>
            </Card>
          )}
          {programs.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">{es.escalasExistentes}</p>
              {programs.map((program) => (
                <Card key={program.id} className="flex items-center justify-between gap-2 p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {program.startDate} — {program.endDate}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {program.assignmentCount} {es.designacionesLabel} ·{" "}
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleViewProgram(program)}
                  >
                    {es.verEscala}
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

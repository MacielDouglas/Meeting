"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { createCleaningProgram } from "@/features/cleaning/application/cleaning-program-actions";
import {
  type CleaningAssignmentItem,
  type CleaningProgramItem,
  getCleaningProgramDetail,
  listCleaningPrograms,
} from "@/features/cleaning/application/cleaning-program-queries";
import type { CleaningTypeItem } from "@/features/cleaning/application/queries";
import { analyzeDays } from "@/features/cleaning/domain/assign-cleaning";
import type {
  ScheduleExceptionItem,
  SpecialEventItem,
} from "@/features/settings/application/queries";
import type { MeetingSchedule } from "@/features/settings/domain/settings";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { ProgramDetail } from "./ProgramDetail";

interface CleaningDesignationSectionProps {
  cleaningConfig: CleaningTypeItem[];
  specialEvents: SpecialEventItem[];
  scheduleExceptions: ScheduleExceptionItem[];
  meetingSchedule: MeetingSchedule;
  congregationName?: string;
}

const CLEANING_TYPE_LABELS: Record<string, string> = {
  per_meeting: es.limpiezaCadaReunion,
  weekly: es.limpiezaSemanal,
  general: es.limpiezaGeneral,
};

function toISODateInput(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getFirstMidweek(year: number, month: number, midweekDay: number): Date {
  const first = new Date(Date.UTC(year, month, 1));
  const dow = first.getUTCDay();
  const diff = (midweekDay - dow + 7) % 7;
  return new Date(Date.UTC(year, month, 1 + diff));
}

function getLastWeekend(year: number, month: number, weekendDay: number): Date {
  const last = new Date(Date.UTC(year, month + 1, 0));
  const dow = last.getUTCDay();
  const diff = (dow - weekendDay + 7) % 7;
  return new Date(Date.UTC(year, month, last.getUTCDate() - diff));
}

export function CleaningDesignationSection({
  cleaningConfig,
  specialEvents,
  scheduleExceptions,
  meetingSchedule,
  congregationName = "",
}: CleaningDesignationSectionProps) {
  const enabledTypes = cleaningConfig.filter((t) => t.enabled);
  const [selectedType, setSelectedType] = useState<string>(enabledTypes[0]?.key ?? "per_meeting");

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getUTCFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getUTCMonth());

  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [viewingProgram, setViewingProgram] = useState<{
    program: CleaningProgramItem;
    assignments: CleaningAssignmentItem[];
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultMessages, setResultMessages] = useState<{ date: string; message: string }[]>([]);

  const rangeStartDefault = toISODateInput(
    getFirstMidweek(calendarYear, calendarMonth, meetingSchedule.midweekDay),
  );
  const rangeEndDefault = toISODateInput(
    getLastWeekend(calendarYear, calendarMonth, meetingSchedule.weekendDay),
  );
  const [rangeStart, setRangeStart] = useState(rangeStartDefault);
  const [rangeEnd, setRangeEnd] = useState(rangeEndDefault);

  // Reajusta o período quando mês/ano ou horários das reuniões mudam.
  // Ajuste de estado durante o render (sem useEffect) — o usuário continua
  // livre para editar as datas, que só são recalculadas quando as deps mudam.
  const [prevRangeDeps, setPrevRangeDeps] = useState({
    year: calendarYear,
    month: calendarMonth,
    midweekDay: meetingSchedule.midweekDay,
    weekendDay: meetingSchedule.weekendDay,
  });
  if (
    prevRangeDeps.year !== calendarYear ||
    prevRangeDeps.month !== calendarMonth ||
    prevRangeDeps.midweekDay !== meetingSchedule.midweekDay ||
    prevRangeDeps.weekendDay !== meetingSchedule.weekendDay
  ) {
    setPrevRangeDeps({
      year: calendarYear,
      month: calendarMonth,
      midweekDay: meetingSchedule.midweekDay,
      weekendDay: meetingSchedule.weekendDay,
    });
    setRangeStart(
      toISODateInput(getFirstMidweek(calendarYear, calendarMonth, meetingSchedule.midweekDay)),
    );
    setRangeEnd(
      toISODateInput(getLastWeekend(calendarYear, calendarMonth, meetingSchedule.weekendDay)),
    );
  }

  // Programas via TanStack Query (sem fetch em useEffect): busca fresca a cada
  // montagem/troca de tipo (`staleTime: 0`) e mantém a lista anterior durante
  // refetch, como antes.
  const {
    data: programs = [],
    refetch: refetchPrograms,
    isError: programsError,
  } = useQuery({
    queryKey: ["cleaning-programs", selectedType],
    queryFn: () => listCleaningPrograms(selectedType),
    staleTime: 0,
    placeholderData: (previousData) => previousData,
  });

  const loadPrograms = useCallback(async () => {
    await refetchPrograms();
  }, [refetchPrograms]);

  // Só programas ativos bloqueiam novas tabelas (arquivados liberam o período).
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

  const days = analyzeDays({
    typeKey: selectedType as "per_meeting" | "weekly" | "general",
    startDate: `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-01`,
    endDate: `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(new Date(Date.UTC(calendarYear, calendarMonth + 1, 0)).getUTCDate()).padStart(2, "0")}`,
    sectors: [],
    persons: [],
    midweekDay: meetingSchedule.midweekDay,
    weekendDay: meetingSchedule.weekendDay,
    specialEvents,
    scheduleExceptions,
  });

  const rangeMeetingDays = useMemo(() => {
    if (selectedType !== "per_meeting" || !rangeStart || !rangeEnd || rangeStart > rangeEnd)
      return [];
    const rangeDays = analyzeDays({
      typeKey: "per_meeting",
      startDate: rangeStart,
      endDate: rangeEnd,
      sectors: [],
      persons: [],
      midweekDay: meetingSchedule.midweekDay,
      weekendDay: meetingSchedule.weekendDay,
      specialEvents,
      scheduleExceptions,
    });
    return rangeDays.filter(
      (d) => (d.isMidweek || d.isWeekend) && !d.assemblyType && !d.celebrationReplacement,
    );
  }, [selectedType, rangeStart, rangeEnd, meetingSchedule, specialEvents, scheduleExceptions]);

  // Datas selecionadas que já têm tabela (duplicidade) — bloqueadas no calendário.
  const duplicateSelectedDates = useMemo(
    () => [...selectedDates].filter((d) => programDates.has(d)),
    [selectedDates, programDates],
  );

  // Programas que colidem com o período de "limpeza a cada reunião".
  const rangeOverlapDates = useMemo(() => {
    if (selectedType !== "per_meeting") return [];
    return rangeMeetingDays.map((d) => d.date).filter((d) => programDates.has(d));
  }, [selectedType, rangeMeetingDays, programDates]);

  const rangeOverlapPrograms = useMemo(() => {
    if (rangeOverlapDates.length === 0) return [];
    const dup = new Set(rangeOverlapDates);
    return activePrograms.filter((p) => {
      const current = new Date(`${p.startDate}T00:00:00Z`);
      const end = new Date(`${p.endDate}T00:00:00Z`);
      while (current <= end) {
        if (dup.has(current.toISOString().slice(0, 10))) return true;
        current.setUTCDate(current.getUTCDate() + 1);
      }
      return false;
    });
  }, [rangeOverlapDates, activePrograms]);

  function handleDateClick(date: string) {
    if (programDates.has(date)) {
      setErrorMsg(`${date}: ${es.tablaDuplicada}`);
      return;
    }
    setErrorMsg(null);
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function handlePrevMonth() {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setErrorMsg(null);
    setStatusMsg(null);
    setResultMessages([]);

    let dates: string[];
    if (selectedType === "per_meeting") {
      if (!rangeStart || !rangeEnd) {
        setErrorMsg(es.informaFechas);
        setCreating(false);
        return;
      }
      if (rangeStart > rangeEnd) {
        setErrorMsg(es.fechaInicioAnterior);
        setCreating(false);
        return;
      }
      dates = rangeMeetingDays.map((d) => d.date);
      if (dates.length === 0) {
        setErrorMsg(es.ningunDiaReunion);
        setCreating(false);
        return;
      }
      const overlap = dates.filter((d) => programDates.has(d));
      if (overlap.length > 0) {
        const conflict = rangeOverlapPrograms[0];
        setErrorMsg(
          conflict
            ? `${conflict.startDate} — ${conflict.endDate}: ${es.tablaDuplicada}`
            : `${es.tablaDuplicada}`,
        );
        setCreating(false);
        return;
      }
    } else {
      if (selectedDates.size === 0) {
        setErrorMsg(es.seleccionaDia);
        setCreating(false);
        return;
      }
      const overlap = [...selectedDates].filter((d) => programDates.has(d));
      if (overlap.length > 0) {
        setErrorMsg(`${overlap.sort()[0]}: ${es.tablaDuplicada}`);
        setCreating(false);
        return;
      }
      dates = [...selectedDates];
    }

    const result = await createCleaningProgram(selectedType, dates);

    if (result.ok) {
      setStatusMsg(
        `${es.programaLimpiezaCreado} (${result.assignmentCount ?? 0} ${es.designacionesLabel}).`,
      );
      setResultMessages(result.messages ?? []);
      setSelectedDates(new Set());
      await loadPrograms();
    } else {
      setErrorMsg(result.error ?? es.errorGuardar);
    }
    setCreating(false);
  }

  async function handleViewProgram(program: CleaningProgramItem) {
    const detail = await getCleaningProgramDetail(program.id);
    setViewingProgram(detail);
  }

  const selectedCount =
    selectedType === "per_meeting" ? rangeMeetingDays.length : selectedDates.size;

  return (
    <div className="flex flex-col gap-4">
      {enabledTypes.length > 0 && (
        <div className="flex rounded-xl bg-secondary p-1">
          {enabledTypes.map((type) => (
            <button
              key={type.key}
              type="button"
              onClick={() => {
                setSelectedType(type.key);
                setSelectedDates(new Set());
                setViewingProgram(null);
              }}
              className={`h-8 flex-1 rounded-lg px-2 font-display text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                selectedType === type.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {CLEANING_TYPE_LABELS[type.key] ?? type.key}
            </button>
          ))}
        </div>
      )}

      {enabledTypes.length === 0 && (
        <Card className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{es.ningunTipoLimpieza}</p>
        </Card>
      )}

      {enabledTypes.length > 0 && !viewingProgram && (
        <>
          {selectedType === "per_meeting" && (
            <Card className="flex flex-col gap-3 p-4">
              <p className="text-sm font-medium">{es.periodoLimpieza}</p>
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
              {rangeStart && rangeEnd && rangeStart <= rangeEnd && (
                <p className="text-xs text-muted-foreground">
                  {rangeMeetingDays.length} {es.diasReunionEnPeriodo}
                </p>
              )}
              {rangeOverlapDates.length > 0 && (
                <div
                  role="alert"
                  className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger-on-soft"
                >
                  {rangeOverlapPrograms[0]
                    ? `${rangeOverlapPrograms[0].startDate} — ${rangeOverlapPrograms[0].endDate}: ${es.tablaDuplicada}`
                    : es.tablaDuplicada}
                </div>
              )}
            </Card>
          )}

          {selectedType !== "per_meeting" && (
            <MonthlyCalendar
              year={calendarYear}
              month={calendarMonth}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              days={days}
              selectedDates={selectedDates}
              programDates={programDates}
              onDateClick={handleDateClick}
            />
          )}

          {selectedType !== "per_meeting" && selectedCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedCount} {es.diasSeleccionados}
            </p>
          )}
          {selectedType !== "per_meeting" && duplicateSelectedDates.length > 0 && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger-on-soft"
            >
              {duplicateSelectedDates.sort()[0]}: {es.tablaDuplicada}
            </div>
          )}

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
          {resultMessages.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning-soft p-3">
              <p className="mb-1 text-xs font-semibold text-warning-on-soft">{es.avisosSorteo}</p>
              {resultMessages.map((msg) => (
                <p key={`${msg.date}-${msg.message}`} className="text-xs text-warning-on-soft">
                  {msg.date}: {msg.message}
                </p>
              ))}
            </div>
          )}

          <Button
            disabled={
              creating ||
              selectedCount === 0 ||
              duplicateSelectedDates.length > 0 ||
              rangeOverlapDates.length > 0
            }
            onClick={() => void handleCreate()}
          >
            {creating ? es.creandoPrograma : es.crearProgramaLimpieza}
          </Button>
        </>
      )}

      {viewingProgram && (
        <div className="flex flex-col gap-3">
          <Button variant="outline" onClick={() => setViewingProgram(null)}>
            ← {es.volverCalendario}
          </Button>
          <ProgramDetail
            program={viewingProgram.program}
            assignments={viewingProgram.assignments}
            typeKey={selectedType}
            sectors={
              cleaningConfig
                .find((t) => t.key === selectedType)
                ?.sectors.map((s) => ({
                  key: s.key,
                  id: s.id,
                  requiredSex: s.requiredSex,
                  allowYoung: s.allowYoung,
                })) ?? []
            }
            congregationName={congregationName}
            sectorTasks={Object.fromEntries(
              (cleaningConfig.find((t) => t.key === selectedType)?.sectors ?? []).map((s) => [
                s.key ?? s.id,
                s.task ?? "",
              ]),
            )}
            onClose={() => setViewingProgram(null)}
            onDeleted={() => {
              setViewingProgram(null);
              void loadPrograms();
            }}
            onRefresh={async () => {
              const detail = await getCleaningProgramDetail(viewingProgram.program.id);
              setViewingProgram(detail);
              await loadPrograms();
            }}
          />
        </div>
      )}

      {!viewingProgram && programsError && programs.length === 0 && (
        <Card className="flex flex-col gap-3">
          <p role="alert" className="text-sm text-danger">
            {es.errorCargarLista}
          </p>
          <div>
            <Button size="sm" variant="outline" onClick={() => void loadPrograms()}>
              {es.reintentar}
            </Button>
          </div>
        </Card>
      )}
      {!viewingProgram && programs.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{es.programasExistentes}</p>
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
              <Button size="sm" variant="outline" onClick={() => void handleViewProgram(program)}>
                {es.verPrograma}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

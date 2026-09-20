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
import { MonthlyCalendar } from "./MonthlyCalendar";
import { ProgramDetail } from "./ProgramDetail";

interface CleaningDesignationSectionProps {
  cleaningConfig: CleaningTypeItem[];
  specialEvents: SpecialEventItem[];
  scheduleExceptions: ScheduleExceptionItem[];
  meetingSchedule: MeetingSchedule;
}

const CLEANING_TYPE_LABELS: Record<string, string> = {
  per_meeting: "Limpeza a cada reunião",
  weekly: "Limpeza Semanal",
  general: "Limpeza Geral",
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
  const { data: programs = [], refetch: refetchPrograms } = useQuery({
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
      setErrorMsg(
        `Já foi criada tabela para aquela semana (${date}). Edite a tabela existente em vez de criar outra.`,
      );
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
        setErrorMsg("Informe as datas inicial e final.");
        setCreating(false);
        return;
      }
      if (rangeStart > rangeEnd) {
        setErrorMsg("A data inicial deve ser anterior à data final.");
        setCreating(false);
        return;
      }
      dates = rangeMeetingDays.map((d) => d.date);
      if (dates.length === 0) {
        setErrorMsg("Nenhum dia de reunião encontrado no período selecionado.");
        setCreating(false);
        return;
      }
      const overlap = dates.filter((d) => programDates.has(d));
      if (overlap.length > 0) {
        const conflict = rangeOverlapPrograms[0];
        setErrorMsg(
          conflict
            ? `Já foi criada tabela para aquela semana (${conflict.startDate} — ${conflict.endDate}). Edite a tabela existente em vez de criar outra.`
            : `Já foi criada tabela para ${overlap.length} dia(s) do período escolhido. Ajuste o período ou edite a tabela existente.`,
        );
        setCreating(false);
        return;
      }
    } else {
      if (selectedDates.size === 0) {
        setErrorMsg("Selecione ao menos um dia no calendário.");
        setCreating(false);
        return;
      }
      const overlap = [...selectedDates].filter((d) => programDates.has(d));
      if (overlap.length > 0) {
        setErrorMsg(
          `Já foi criada tabela para aquela semana (${overlap.sort()[0]}). Edite a tabela existente em vez de criar outra.`,
        );
        setCreating(false);
        return;
      }
      dates = [...selectedDates];
    }

    const result = await createCleaningProgram(selectedType, dates);

    if (result.ok) {
      setStatusMsg(`Programa criado com ${result.assignmentCount ?? 0} designações.`);
      setResultMessages(result.messages ?? []);
      setSelectedDates(new Set());
      await loadPrograms();
    } else {
      setErrorMsg(result.error ?? "Erro ao criar programa.");
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
        <div className="flex gap-2">
          {enabledTypes.map((type) => (
            <button
              key={type.key}
              type="button"
              onClick={() => {
                setSelectedType(type.key);
                setSelectedDates(new Set());
                setViewingProgram(null);
              }}
              className={`h-9 flex-1 rounded-full px-2 text-sm font-medium transition-colors ${
                selectedType === type.key
                  ? "bg-sky-500 text-white"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {CLEANING_TYPE_LABELS[type.key] ?? type.key}
            </button>
          ))}
        </div>
      )}

      {enabledTypes.length === 0 && (
        <Card className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            Nenhum tipo de limpeza ativado. Ative na aba Configurações &gt; Limpeza.
          </p>
        </Card>
      )}

      {enabledTypes.length > 0 && !viewingProgram && (
        <>
          {selectedType === "per_meeting" && (
            <Card className="flex flex-col gap-3 p-4">
              <p className="text-sm font-medium">Período da limpeza</p>
              <div className="flex gap-3">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Data inicial</span>
                  <input
                    type="date"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Data final</span>
                  <input
                    type="date"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                  />
                </label>
              </div>
              {rangeStart && rangeEnd && rangeStart <= rangeEnd && (
                <p className="text-xs text-muted-foreground">
                  {rangeMeetingDays.length} dia(s) de reunião no período
                </p>
              )}
              {rangeOverlapDates.length > 0 && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
                >
                  Já foi criada tabela para aquela semana
                  {rangeOverlapPrograms[0]
                    ? ` (${rangeOverlapPrograms[0].startDate} — ${rangeOverlapPrograms[0].endDate})`
                    : ""}
                  . Edite a tabela existente em vez de criar outra.
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
            <p className="text-sm text-muted-foreground">{selectedCount} dia(s) selecionado(s)</p>
          )}
          {selectedType !== "per_meeting" && duplicateSelectedDates.length > 0 && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
            >
              Já foi criada tabela para aquela semana ({duplicateSelectedDates.sort()[0]}). Edite a
              tabela existente em vez de criar outra.
            </div>
          )}

          {errorMsg && (
            <p role="alert" className="text-sm text-red-500">
              {errorMsg}
            </p>
          )}
          {statusMsg && <p className="text-sm text-emerald-500">{statusMsg}</p>}
          {resultMessages.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="mb-1 text-xs font-semibold text-amber-700">
                Avisos do sorteio (revise antes de confirmar)
              </p>
              {resultMessages.map((msg) => (
                <p key={`${msg.date}-${msg.message}`} className="text-xs text-amber-600">
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
            {creating ? "Criando..." : "Criar Programa de Limpeza"}
          </Button>
        </>
      )}

      {viewingProgram && (
        <div className="flex flex-col gap-3">
          <Button variant="outline" onClick={() => setViewingProgram(null)}>
            ← Voltar ao calendário
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

      {!viewingProgram && programs.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Programas existentes</p>
          {programs.map((program) => (
            <Card key={program.id} className="flex items-center justify-between gap-2 p-3">
              <div>
                <p className="text-sm font-medium">
                  {program.startDate} — {program.endDate}
                </p>
                <p className="text-xs text-muted-foreground">
                  {program.assignmentCount} designações ·{" "}
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
              <Button size="sm" variant="outline" onClick={() => void handleViewProgram(program)}>
                Ver
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

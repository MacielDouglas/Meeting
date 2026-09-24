"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MonthlyCalendar } from "@/features/cleaning/presentation/MonthlyCalendar";
import {
  listProgramDates,
  listProgramsForPdf,
  type PdfProgramItem,
} from "@/features/meetings/application/meeting-queries";
import { generateMeetingPdf } from "@/features/meetings/pdf/meeting-pdf";
import { mapProgramsToPdfData } from "@/features/meetings/pdf/meeting-pdf-data";
import {
  formatMeetingDate,
  MEETING_PDF_FILE_PREFIXES,
  MEETING_PDF_LABELS_ES,
} from "@/features/meetings/pdf/meeting-pdf-i18n";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { es } from "@/shared/i18n/es";
import { cn } from "@/shared/lib/utils";

const MONTH_NAMES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEKDAY_HEADERS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type MeetingKind = "midweek" | "weekend";

interface PdfExportModalProps {
  kind: MeetingKind;
  midweekDay: number;
  weekendDay: number;
  congregationName: string;
  onClose: () => void;
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthRange(year: number, month: number): { from: string; to: string } {
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return { from: toISO(year, month, 1), to: toISO(year, month, last) };
}

function enumerateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const [y, m, d] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d));
  const stop = new Date(Date.UTC(ey, em - 1, ed));
  while (cursor <= stop) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (dates.length > 400) break;
  }
  return dates;
}

export function PdfExportModal({
  kind,
  midweekDay,
  weekendDay,
  congregationName,
  onClose,
}: PdfExportModalProps) {
  const today = new Date();
  const [activeKind, setActiveKind] = useState<MeetingKind>(kind);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const weekday = activeKind === "midweek" ? midweekDay : weekendDay;
  const window = monthRange(year, month);

  const programDatesQuery = useQuery({
    queryKey: ["pdf-program-dates", activeKind, window.from, window.to],
    queryFn: () => listProgramDates(activeKind, window.from, window.to),
  });
  const programDates = useMemo(
    () => new Set(programDatesQuery.data ?? []),
    [programDatesQuery.data],
  );

  const days = useMemo(() => {
    const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return Array.from({ length: last }, (_, i) => {
      const date = toISO(year, month, i + 1);
      const dow = new Date(Date.UTC(year, month, i + 1)).getUTCDay();
      return {
        date,
        isMidweek: activeKind === "midweek" && dow === weekday,
        isWeekend: activeKind === "weekend" && dow === weekday,
        assemblyType: null,
        celebrationReplacement: false,
      };
    });
  }, [year, month, activeKind, weekday]);

  function handleDateClick(date: string) {
    setError(null);
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }
    if (date >= rangeStart) setRangeEnd(date);
    else {
      setRangeEnd(rangeStart);
      setRangeStart(date);
    }
  }

  const selectedDates = useMemo(() => {
    if (!rangeStart) return new Set<string>();
    return new Set(enumerateRange(rangeStart, rangeEnd ?? rangeStart));
  }, [rangeStart, rangeEnd]);

  const meetingsInRange = useMemo(() => {
    if (!rangeStart) return [];
    return enumerateRange(rangeStart, rangeEnd ?? rangeStart).filter((date) => {
      const [y, m, d] = date.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === weekday;
    });
  }, [rangeStart, rangeEnd, weekday]);

  async function handleGenerate() {
    if (!rangeStart || generating) return;
    const end = rangeEnd ?? rangeStart;
    setGenerating(true);
    setError(null);
    setWarning(null);
    try {
      const programs: PdfProgramItem[] = await listProgramsForPdf(activeKind, rangeStart, end);
      if (programs.length === 0) {
        setError(es.sinProgramaEnRango);
        return;
      }
      const found = new Set(programs.map((p) => p.date));
      const missing = meetingsInRange.filter((date) => !found.has(date));
      if (missing.length > 0) {
        setWarning(
          `${es.sinPrograma}: ${missing.map((date) => formatMeetingDate(date)).join(", ")}`,
        );
      }
      const meetings = mapProgramsToPdfData(programs, congregationName.trim() || es.appName);
      // Import dinâmico: jspdf só baixa quando o usuário gera o PDF.
      const { jsPDF } = await import("jspdf");
      const isMidweek = activeKind === "midweek";
      generateMeetingPdf({
        meetings,
        labels: MEETING_PDF_LABELS_ES,
        documentTitle: isMidweek
          ? MEETING_PDF_LABELS_ES.documentTitle
          : MEETING_PDF_LABELS_ES.weekendDocumentTitle,
        filePrefixSingle: isMidweek
          ? MEETING_PDF_FILE_PREFIXES.single
          : MEETING_PDF_FILE_PREFIXES.weekendSingle,
        filePrefixPlural: isMidweek
          ? MEETING_PDF_FILE_PREFIXES.plural
          : MEETING_PDF_FILE_PREFIXES.weekendPlural,
        createPdf: () => new jsPDF({ unit: "mm", format: "a4" }),
        perPage: isMidweek ? 2 : 4,
      });
      if (missing.length === 0) onClose();
    } catch {
      setError(es.errorGuardar);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="leading-snug">{es.crearPdf}</DialogTitle>
          <p className="font-display text-sm font-medium text-muted-foreground">{es.eligeRango}</p>
        </DialogHeader>

        <fieldset className="flex rounded-xl bg-secondary p-1">
          <legend className="sr-only">{es.crearPdf}</legend>
          {(["midweek", "weekend"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setActiveKind(option);
                setRangeStart(null);
                setRangeEnd(null);
              }}
              className={cn(
                "h-8 flex-1 rounded-lg font-display text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                activeKind === option
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option === "midweek" ? es.entreSemana : es.finSemana}
            </button>
          ))}
        </fieldset>

        <MonthlyCalendar
          year={year}
          month={month}
          onPrevMonth={() =>
            setMonth((m) => {
              if (m === 0) {
                setYear((y) => y - 1);
                return 11;
              }
              return m - 1;
            })
          }
          onNextMonth={() =>
            setMonth((m) => {
              if (m === 11) {
                setYear((y) => y + 1);
                return 0;
              }
              return m + 1;
            })
          }
          days={days}
          selectedDates={selectedDates}
          programDates={programDates}
          onDateClick={handleDateClick}
          monthNames={MONTH_NAMES_ES}
          weekdayHeaders={WEEKDAY_HEADERS_ES}
          disableProgramDates={false}
          programDateHint={es.programaGuardadoHint}
        />

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success" />
          {es.eligeSemanaVerde}
        </p>

        {rangeStart && (
          <p className="text-sm text-muted-foreground">
            {es.rangoInicio}: {formatMeetingDate(rangeStart)}
            {rangeEnd ? ` · ${es.rangoFin}: ${formatMeetingDate(rangeEnd)}` : ""} ·{" "}
            {meetingsInRange.length} {es.reunionesEnRango}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {warning && (
          <p role="status" className="text-sm text-warning">
            {warning}
          </p>
        )}

        <DialogFooter>
          <DialogClose className="mt-0 flex-1">{es.cancel}</DialogClose>
          <Button
            disabled={!rangeStart || generating}
            onClick={() => void handleGenerate()}
            className="flex-1"
          >
            {generating ? es.generandoPdf : es.generarPdf}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

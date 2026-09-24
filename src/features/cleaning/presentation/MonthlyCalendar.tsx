"use client";

import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const MONTH_NAMES = [
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

const WEEKDAY_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return day === 0 ? 6 : day - 1;
}

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface DayInfo {
  date: string;
  isMidweek: boolean;
  isWeekend: boolean;
  assemblyType: string | null;
  celebrationReplacement: boolean;
}

interface MonthlyCalendarProps {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  days: DayInfo[];
  selectedDates: Set<string>;
  programDates: Set<string>;
  onDateClick: (date: string) => void;
  monthNames?: string[];
  weekdayHeaders?: string[];
  /** false libera clicar em datas com programa (padrão da limpeza: bloqueia). */
  disableProgramDates?: boolean;
  /** Texto do tooltip nas datas com programa. */
  programDateHint?: string;
}

interface CalendarCell {
  /** Id estável da célula: data ISO para dias, posição da grade para vazios. */
  key: string;
  day: number | null;
}

export function MonthlyCalendar({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  days,
  selectedDates,
  programDates,
  onDateClick,
  monthNames = MONTH_NAMES,
  weekdayHeaders = WEEKDAY_HEADERS,
  disableProgramDates = true,
  programDateHint = "Ya fue creada tabla para aquella semana — edita la tabla existente",
}: MonthlyCalendarProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const dayMap = new Map(days.map((d) => [d.date, d]));

  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, key: `pad-start-${i}` });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, key: toISODate(year, month, d) });
  while (cells.length % 7 !== 0) cells.push({ day: null, key: `pad-end-${cells.length}` });

  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          className="grid h-11 w-11 place-items-center rounded-xl hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label="Mes anterior"
        >
          <FaChevronLeft size={14} />
        </button>
        <h3 className="text-sm font-semibold">
          {monthNames[month]} {year}
        </h3>
        <button
          type="button"
          onClick={onNextMonth}
          className="grid h-11 w-11 place-items-center rounded-xl hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label="Próximo mes"
        >
          <FaChevronRight size={14} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {weekdayHeaders.map((h) => (
          <div key={h} className="py-1 text-center text-xs font-medium text-muted-foreground">
            {h}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          if (cell.day === null) return <div key={cell.key} />;

          const dateStr = cell.key;
          const info = dayMap.get(dateStr);
          const isMeeting = info?.isMidweek || info?.isWeekend;
          const isAssembly = info?.assemblyType && !info?.celebrationReplacement;
          const isSelected = selectedDates.has(dateStr);
          const hasProgram = programDates.has(dateStr);

          let bgClass = "";
          if (isAssembly) bgClass = "bg-danger-soft text-danger";
          else if (isSelected) bgClass = "bg-accent text-accent-ink";
          else if (hasProgram) bgClass = "bg-success-soft text-success";
          else if (isMeeting) bgClass = "bg-accent/10 text-accent";

          const isBlocked = disableProgramDates && hasProgram;
          const day = cell.day;
          return (
            <button
              key={cell.key}
              type="button"
              disabled={isBlocked}
              onClick={() => onDateClick(dateStr)}
              aria-disabled={isBlocked}
              className={`relative flex h-9 w-full items-center justify-center rounded-lg text-sm transition-colors ${isBlocked ? "cursor-not-allowed opacity-70" : "hover:opacity-80"} ${bgClass}`}
              title={isAssembly ? (info?.assemblyType ?? "") : hasProgram ? programDateHint : ""}
            >
              {day}
              {isMeeting && !isAssembly && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" />
              )}
              {isAssembly && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-danger" />
              )}
              {hasProgram && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-success" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

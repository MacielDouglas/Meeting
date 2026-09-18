"use client";

import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAY_HEADERS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

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
  midweekDay: number;
  weekendDay: number;
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
  midweekDay: _midweekDay,
  weekendDay: _weekendDay,
}: MonthlyCalendarProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const dayMap = new Map(days.map((d) => [d.date, d]));

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          className="rounded-lg p-2 hover:bg-secondary"
          aria-label="Mês anterior"
        >
          <FaChevronLeft size={14} />
        </button>
        <h3 className="text-sm font-semibold">
          {MONTH_NAMES[month]} {year}
        </h3>
        <button
          type="button"
          onClick={onNextMonth}
          className="rounded-lg p-2 hover:bg-secondary"
          aria-label="Próximo mês"
        >
          <FaChevronRight size={14} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAY_HEADERS.map((h) => (
          <div key={h} className="py-1 text-center text-xs font-medium text-muted-foreground">
            {h}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          // biome-ignore lint/suspicious/noArrayIndexKey: grid estatica 42 celulas, ordem fixa
          if (day === null) return <div key={`empty-${i}`} />;

          const dateStr = toISODate(year, month, day);
          const info = dayMap.get(dateStr);
          const isMeeting = info?.isMidweek || info?.isWeekend;
          const isAssembly = info?.assemblyType && !info?.celebrationReplacement;
          const isSelected = selectedDates.has(dateStr);
          const hasProgram = programDates.has(dateStr);

          let bgClass = "";
          if (isAssembly) bgClass = "bg-red-100 text-red-700";
          else if (isSelected) bgClass = "bg-sky-500 text-white";
          else if (hasProgram) bgClass = "bg-emerald-100 text-emerald-700";
          else if (isMeeting) bgClass = "bg-sky-50 text-sky-700";

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onDateClick(dateStr)}
              className={`relative flex h-9 w-full items-center justify-center rounded-lg text-sm transition-colors hover:opacity-80 ${bgClass}`}
              title={
                isAssembly ? (info?.assemblyType ?? "") : hasProgram ? "Programa existente" : ""
              }
            >
              {day}
              {isMeeting && !isAssembly && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-sky-500" />
              )}
              {isAssembly && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-red-500" />
              )}
              {hasProgram && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

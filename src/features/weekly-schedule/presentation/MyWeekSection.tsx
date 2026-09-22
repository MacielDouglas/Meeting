import Link from "next/link";
import { FaCalendarDay, FaChevronDown, FaClock, FaLocationDot } from "react-icons/fa6";
import {
  assignmentSummary,
  daysUntil,
  displayPartTitle,
  formatShortDay,
  formatWeekday,
  groupPartsBySection,
  helperRoleOf,
  type MyWeek,
  type MyWeekMeeting,
  urgencyLabel,
} from "@/features/weekly-schedule/domain/my-week";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";
import { todayLocalISO } from "@/shared/lib/format-date";
import { cn } from "@/shared/lib/utils";

interface MyWeekSectionProps {
  myWeek: MyWeek;
}

function PartNames({
  personName,
  helperPersonName,
  partKey,
}: {
  personName: string;
  helperPersonName: string;
  partKey: string;
}) {
  if (!helperPersonName) return <span className="block break-words text-xs">{personName}</span>;
  return (
    <span className="block break-words text-xs">
      {personName} y {helperPersonName} ({helperRoleOf(partKey)})
    </span>
  );
}

/** Data, hora e local com rótulos para leitor de tela. */
function MeetingMeta({ meeting }: { meeting: MyWeekMeeting }) {
  return (
    <ul className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
      <li className="flex items-center gap-2">
        <FaCalendarDay aria-hidden />
        <span>
          <span className="sr-only">Fecha: </span>
          {formatWeekday(meeting.date)} {formatShortDay(meeting.date)}
        </span>
        <FaClock aria-hidden />
        <span>
          <span className="sr-only">Hora: </span>
          {meeting.time}
        </span>
      </li>
      <li className="flex items-center gap-2">
        <FaLocationDot aria-hidden />
        <span>
          <span className="sr-only">Lugar: </span>
          {meeting.location}
        </span>
      </li>
    </ul>
  );
}

/**
 * Partes + limpeza com disclosure progressivo: só rende a seção que tem
 * conteúdo. Sem nada, uma única linha honesta em vez de três vazios.
 * A seção fixa "En la reunión" foi removida: vazia por padrão, lia-se como
 * erro; designação real aparece em "Mis partes".
 */
function MeetingSections({ meeting }: { meeting: MyWeekMeeting }) {
  const groups = groupPartsBySection(meeting.parts);
  const hasParts = groups.length > 0;
  const hasCleaning = meeting.cleaning.length > 0;
  if (!hasParts && !hasCleaning) {
    return <p className="mt-3 text-sm text-muted-foreground">{assignmentSummary(0, 0)}</p>;
  }
  return (
    <div className="mt-3 flex flex-col gap-3">
      {hasParts && (
        <section aria-label="Mis partes">
          {groups.map((group) => (
            <div key={group.section || "general"}>
              {group.section && (
                <p className="mt-2 text-xs font-semibold capitalize tracking-tight text-muted-foreground first:mt-0">
                  {group.section.toLowerCase()}
                </p>
              )}
              <ul className="flex flex-col">
                {group.parts.map((part) => (
                  <li
                    key={part.partKey}
                    className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-b-0"
                  >
                    <span className="min-w-0 flex-1 text-sm font-medium">
                      {displayPartTitle(part)}
                      {part.durationMinutes ? ` (${part.durationMinutes} min)` : ""}
                    </span>
                    <span className="max-w-[55%] shrink-0 text-right text-muted-foreground">
                      <PartNames
                        personName={part.personName}
                        helperPersonName={part.helperPersonName}
                        partKey={part.partKey}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {hasCleaning && (
        <section aria-label="Limpieza">
          <p className="text-xs font-semibold text-muted-foreground">Limpieza</p>
          <ul className="flex flex-col">
            {meeting.cleaning.map((item) => (
              <li
                key={`${item.assignmentDate}-${item.sectorName}`}
                className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0"
              >
                <span className="font-medium">{item.sectorName}</span>
                {item.isFamily && <span className="text-xs text-muted-foreground">familia</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function MeetingBlock({ meeting, today }: { meeting: MyWeekMeeting; today: string }) {
  const summary = assignmentSummary(meeting.parts.length, meeting.cleaning.length);

  if (!meeting.isNext) {
    return (
      <details className="group rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block font-display text-xl font-semibold leading-tight tracking-tight">
              {meeting.title}
            </span>
            <span className="mt-1 block break-words text-sm text-muted-foreground">
              {formatWeekday(meeting.date)} {formatShortDay(meeting.date)} · {meeting.time} ·{" "}
              {summary}
            </span>
          </span>
          <FaChevronDown
            aria-hidden
            size={16}
            className="shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-open:rotate-180"
          />
        </summary>
        <div className="px-4 pb-4">
          <MeetingMeta meeting={meeting} />
          <MeetingSections meeting={meeting} />
        </div>
      </details>
    );
  }

  // Dia da sessão: o herói acende em azul no dia.
  const isMatchDay = daysUntil(meeting.date, today) === 0;

  return (
    <Card className={cn("p-4", meeting.isNext && "ring-2 ring-accent")}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-xl font-semibold leading-tight tracking-tight">
          {meeting.title}
        </h2>
        {meeting.isNext && <Badge>{isMatchDay ? es.hoy : "Próxima"}</Badge>}
      </div>

      <div
        className={cn(
          "mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 motion-safe:animate-[home-rise_.35s_cubic-bezier(.16,1,.3,1)_backwards]",
          isMatchDay ? "bg-accent text-accent-ink" : "bg-secondary",
        )}
      >
        <p className="shrink-0 font-display text-4xl font-semibold leading-none tracking-tight">
          {urgencyLabel(meeting.date, today)}
        </p>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold">
            {formatWeekday(meeting.date)} {formatShortDay(meeting.date)} · {meeting.time}
          </p>
          <p
            className={cn(
              "break-words text-xs",
              isMatchDay ? "text-accent-ink" : "text-muted-foreground",
            )}
          >
            {meeting.location}
          </p>
          <p
            className={cn(
              "break-words text-xs",
              isMatchDay ? "text-accent-ink" : "text-muted-foreground",
            )}
          >
            {summary}
          </p>
        </div>
      </div>

      <MeetingSections meeting={meeting} />
    </Card>
  );
}

export function MyWeekSection({ myWeek }: MyWeekSectionProps) {
  const today = todayLocalISO();
  const weekOff =
    myWeek.personName != null &&
    myWeek.meetings.every((meeting) => meeting.parts.length === 0 && meeting.cleaning.length === 0);
  const venue = myWeek.meetings[0]?.location || "el Salón";
  return (
    <section aria-label="Mi semana" className="flex flex-col gap-3">
      {myWeek.personName ? (
        <p className="text-sm text-muted-foreground">{myWeek.personName}</p>
      ) : (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">
            Tu usuario aún no está vinculado a una persona.{" "}
            <Link href="/personas" className="font-medium text-accent underline">
              Vincular en Personas
            </Link>
          </p>
        </Card>
      )}
      {myWeek.meetings.map((meeting) => (
        <MeetingBlock key={meeting.kind} meeting={meeting} today={today} />
      ))}
      {weekOff && (
        <p className="px-1 text-sm text-muted-foreground">
          Semana de recuperación: sin asignación. Nos vemos en {venue}.
        </p>
      )}
    </section>
  );
}

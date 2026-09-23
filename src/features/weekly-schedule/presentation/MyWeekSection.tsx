import Link from "next/link";
import { FaCalendarDay, FaChevronDown, FaClock, FaLocationDot } from "react-icons/fa6";
import { DutyKeyIcon } from "@/features/meeting-duties/presentation/DutyKeyIcon";
import { sectionMetaOf } from "@/features/meetings/domain/section-meta";
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
import { Card } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";
import { todayLocalISO } from "@/shared/lib/format-date";
import { cn } from "@/shared/lib/utils";

interface MyWeekSectionProps {
  myWeek: MyWeek;
  /** O usuário pode vincular a si mesmo (owner/admin) ou só pedir ao admin. */
  canLinkAccount: boolean;
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
    <ul className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground">
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
 * Partes + limpeza + apoio com disclosure progressivo: só rende a seção que
 * tem conteúdo. Sem nada, uma única linha honesta em vez de vazios.
 * A seção fixa "En la reunión" foi removida: vazia por padrão, lia-se como
 * erro; designação real aparece em "Mis partes" e no apoio abaixo.
 */
function MeetingSections({ meeting }: { meeting: MyWeekMeeting }) {
  const groups = groupPartsBySection(meeting.parts);
  const hasParts = groups.length > 0;
  const hasCleaning = meeting.cleaning.length > 0;
  const hasDuties = meeting.duties.length > 0;
  if (!hasParts && !hasCleaning && !hasDuties) {
    return <p className="mt-4 text-sm text-muted-foreground">{assignmentSummary(0, 0)}</p>;
  }
  return (
    <div className="mt-4 flex flex-col gap-4">
      {hasParts && (
        <section aria-label="Mis partes">
          {groups.map((group) => (
            <div key={group.section || "general"}>
              {group.section && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold tracking-tight text-muted-foreground first:mt-0">
                  <span
                    aria-hidden
                    className="h-3.5 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: sectionMetaOf(group.section).color }}
                  />
                  {sectionMetaOf(group.section).label}
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

      {hasDuties && (
        <section aria-label={es.enLaReunion}>
          <p className="text-xs font-semibold text-muted-foreground">{es.enLaReunion}</p>
          <ul className="flex flex-col">
            {meeting.duties.map((item) => (
              <li
                key={`${item.assignmentDate}-${item.dutyKey}-${item.postLabel}-${item.side ?? ""}`}
                className="flex items-center gap-2 border-b border-border py-2 text-sm last:border-b-0"
              >
                <DutyKeyIcon dutyKey={item.dutyKey} />
                <span className="font-medium">
                  {item.postLabel}
                  {item.side ? (
                    <span className="font-normal text-muted-foreground"> · {item.side}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function MeetingBlock({ meeting, today }: { meeting: MyWeekMeeting; today: string }) {
  const summary = assignmentSummary(
    meeting.parts.length,
    meeting.cleaning.length,
    meeting.duties.length,
  );

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
              {meeting.location} · {summary}
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
    <Card className={cn("p-4 sm:p-5", meeting.isNext && "ring-2 ring-accent")}>
      <div
        className={cn(
          "flex flex-col gap-1.5 rounded-xl px-3 py-3 motion-safe:animate-[home-rise_.35s_cubic-bezier(.16,1,.3,1)_backwards]",
          isMatchDay ? "bg-accent text-accent-ink" : "bg-secondary",
        )}
      >
        <h2
          className={cn(
            "break-words text-xs font-medium",
            isMatchDay ? "text-accent-ink" : "text-muted-foreground",
          )}
        >
          {meeting.title} · {urgencyLabel(meeting.date, today)}
        </h2>
        <p className="break-words font-display text-3xl font-semibold tabular-nums leading-none tracking-tight">
          {formatWeekday(meeting.date)} {formatShortDay(meeting.date)} · {meeting.time}
        </p>
        <p
          className={cn(
            "flex items-center gap-1.5 break-words text-sm",
            isMatchDay ? "text-accent-ink" : "text-muted-foreground",
          )}
        >
          <FaLocationDot aria-hidden className="shrink-0" />
          <span>
            <span className="sr-only">Lugar: </span>
            {meeting.location} · {summary}
          </span>
        </p>
      </div>

      <MeetingSections meeting={meeting} />
    </Card>
  );
}

export function MyWeekSection({ myWeek, canLinkAccount }: MyWeekSectionProps) {
  const today = todayLocalISO();
  const weekOff =
    myWeek.personName != null &&
    myWeek.meetings.every(
      (meeting) =>
        meeting.parts.length === 0 && meeting.cleaning.length === 0 && meeting.duties.length === 0,
    );
  const venue = myWeek.meetings[0]?.location || "el Salón";
  return (
    <section aria-label="Mi semana" className="section-stack">
      {myWeek.personName ? (
        <p className="text-sm text-muted-foreground">
          Eres <span className="font-medium text-foreground">{myWeek.personName}</span>
        </p>
      ) : (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">
            Tu usuario aún no está vinculado a una persona.{" "}
            {canLinkAccount ? (
              <Link href="/personas" className="font-medium text-accent underline">
                Vincular en Personas
              </Link>
            ) : (
              "Pide a un administrador que lo vincule."
            )}
          </p>
        </Card>
      )}
      {myWeek.meetings.map((meeting) => (
        <MeetingBlock key={meeting.kind} meeting={meeting} today={today} />
      ))}
      {weekOff && (
        <p className="px-1 text-sm text-muted-foreground">
          Sin asignación esta semana. Nos vemos en {venue}.
        </p>
      )}
    </section>
  );
}

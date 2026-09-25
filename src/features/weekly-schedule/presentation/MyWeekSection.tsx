import Link from "next/link";
import { FaListOl } from "react-icons/fa";
import {
  FaBookOpen,
  FaCalendarCheck,
  FaChevronDown,
  FaCircleUser,
  FaLocationDot,
} from "react-icons/fa6";
import { GiBroom } from "react-icons/gi";
import { dutyLabel } from "@/features/meeting-duties/domain/duty-labels";
import { DutyKeyIcon } from "@/features/meeting-duties/presentation/DutyKeyIcon";
import { sectionMetaOf } from "@/features/meetings/domain/section-meta";
import { SpecialEventBanner } from "@/features/meetings/presentation/SpecialEventBanner";
import {
  displayPartTitle,
  formatShortDay,
  formatWeekday,
  groupPartsBySection,
  helperRoleOf,
  type MyWeek,
  type MyWeekMeeting,
  urgencyLabel,
} from "@/features/weekly-schedule/domain/my-week";
import { EmptyState } from "@/shared/components/EmptyState";
import { es } from "@/shared/i18n/es";
import { todayLocalISO } from "@/shared/lib/format-date";
import { cn } from "@/shared/lib/utils";

interface MyWeekSectionProps {
  myWeek: MyWeek;
  /** O usuário pode vincular a si mesmo (owner/admin) ou só pedir ao admin. */
  canLinkAccount: boolean;
}

function kindLabel(kind: MyWeekMeeting["kind"]): string {
  return kind === "midweek" ? es.entreSemana : es.finSemana;
}

function partRole(isHelper: boolean, partKey: string): string {
  if (!isHelper) return es.titular;
  return helperRoleOf(partKey) === "lector" ? es.lector : es.ayudante;
}

/** Parte/titular, apoio e limpeza da reunião, com estados honestos de "sem". */
function HeroRows({
  meeting,
  isMale,
  lead,
}: {
  meeting: MyWeekMeeting;
  isMale: boolean;
  lead: boolean;
}) {
  const groups = groupPartsBySection(meeting.parts);
  const label = lead ? "text-white/60" : "text-muted-foreground";
  const value = lead ? "text-white" : "text-foreground";
  const faint = lead ? "text-white/60" : "text-muted-foreground";
  const line = lead ? "border-white/10" : "border-border";
  return (
    <div className="flex flex-col gap-4">
      <section aria-label={es.miParte}>
        <p className={cn("text-xs font-semibold", label)}>{es.miParte}</p>
        {groups.length === 0 ? (
          <p className={cn("mt-1 text-sm", faint)}>{es.sinParte}</p>
        ) : (
          groups.map((group) => (
            <div key={group.section || "general"}>
              <ul className="flex flex-col">
                {group.parts.map((part) => (
                  <li
                    key={part.partKey}
                    className={cn(
                      "flex items-center justify-between gap-3 border-b py-2 text-sm last:border-b-0",
                      line,
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {group.section ? (
                        <span
                          aria-hidden
                          className="h-3.5 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: sectionMetaOf(group.section).color }}
                        />
                      ) : null}
                      <span className={cn("truncate font-medium", value)}>
                        {displayPartTitle(part)}
                        {part.durationMinutes ? ` (${part.durationMinutes} min)` : ""}
                      </span>
                    </span>
                    <span className={cn("shrink-0 text-sm", faint)}>
                      {partRole(part.isHelper, part.partKey)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {isMale ? (
        <section aria-label={es.miAsignacion}>
          <p className={cn("text-xs font-semibold", label)}>{es.miAsignacion}</p>
          {meeting.duties.length === 0 ? (
            <p className={cn("mt-1 text-sm", faint)}>{es.sinAsignar}</p>
          ) : (
            <ul className="flex flex-col">
              {meeting.duties.map((duty) => (
                <li
                  key={`${duty.assignmentDate}-${duty.dutyKey}-${duty.sortOrder}`}
                  className={cn(
                    "flex items-center gap-2 border-b py-2 text-sm last:border-b-0",
                    line,
                  )}
                >
                  <DutyKeyIcon dutyKey={duty.dutyKey} />
                  <span className={cn("min-w-0 flex-1 truncate font-medium", value)}>
                    {dutyLabel(duty.dutyKey, duty.postLabel)}
                    {duty.side ? (
                      <span className={cn("font-normal", faint)}> · {duty.side}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section aria-label={es.miLimpieza}>
        <p className={cn("text-xs font-semibold", label)}>{es.miLimpieza}</p>
        {meeting.cleaning.length === 0 ? (
          <p className={cn("mt-1 text-sm", faint)}>{es.sinLimpieza}</p>
        ) : (
          <ul className="flex flex-col">
            {meeting.cleaning.map((item) => (
              <li
                key={`${item.assignmentDate}-${item.sectorName}`}
                className={cn(
                  "flex items-center gap-2 border-b py-2 text-sm last:border-b-0",
                  line,
                )}
              >
                <GiBroom aria-hidden size={18} className="shrink-0 text-muted-foreground" />
                <span className={cn("min-w-0 flex-1 truncate font-medium", value)}>
                  {item.sectorName}
                  {item.isFamily ? (
                    <span className={cn("font-normal", faint)}> · {es.familiaMinuscula}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Painel de status da reunião em destaque: preto piano, numerais gigantes. */
function LeadHero({
  meeting,
  today,
  isMale,
}: {
  meeting: MyWeekMeeting;
  today: string;
  isMale: boolean;
}) {
  return (
    <section
      aria-label={`${kindLabel(meeting.kind)} ${formatWeekday(meeting.date)} ${formatShortDay(meeting.date)}`}
      className="hero-panel overflow-hidden rounded-[20px] text-white ring-1 ring-white/10"
    >
      <div className="flex flex-col gap-1.5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-white/10 px-2.5 py-1 font-display text-xs font-semibold text-white">
            {kindLabel(meeting.kind)}
          </span>
          <span className="rounded-lg bg-accent px-2.5 py-1 font-display text-xs font-semibold text-accent-ink">
            {urgencyLabel(meeting.date, today)}
          </span>
        </div>
        <p className="mt-1 break-words text-lg text-white/70">{formatWeekday(meeting.date)}</p>
        <div className="flex items-end justify-between gap-3">
          <p className="break-words font-display text-6xl font-semibold tabular-nums leading-none tracking-tight">
            {formatShortDay(meeting.date)}
          </p>
          <p className="shrink-0 font-display text-3xl font-semibold tabular-nums leading-none tracking-tight text-white/85">
            {meeting.time}
          </p>
        </div>
        <p className="flex items-center gap-1.5 break-words text-sm text-white/60">
          <FaLocationDot aria-hidden className="shrink-0" />
          <span>
            <span className="sr-only">{es.lugar}</span>
            {meeting.location}
          </span>
        </p>
      </div>
      {meeting.notice ? (
        <div className="border-t border-white/10 px-5 py-4 sm:px-6">
          <SpecialEventBanner
            event={meeting.notice.event}
            variant={meeting.notice.variant}
            showTuesdayNote={
              meeting.kind === "midweek" && meeting.notice.variant === "circuit-visit"
            }
            compact
          />
        </div>
      ) : null}
      <div className="border-t border-white/10 px-5 py-4 sm:px-6">
        <HeroRows meeting={meeting} isMale={isMale} lead />
      </div>
    </section>
  );
}

/** Segunda reunião em acordeão; aberta, mostra as mesmas informações do herói. */
function MeetingAccordion({
  meeting,
  today,
  isMale,
}: {
  meeting: MyWeekMeeting;
  today: string;
  isMale: boolean;
}) {
  return (
    <details className="group rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-xs font-medium text-muted-foreground">
            {kindLabel(meeting.kind)}
          </span>
          <span className="block truncate font-display text-xl font-semibold tracking-tight">
            {formatWeekday(meeting.date)} {formatShortDay(meeting.date)} · {meeting.time}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-lg bg-accent px-2 py-1 font-display text-xs font-semibold text-accent-ink">
            {urgencyLabel(meeting.date, today)}
          </span>
          <FaChevronDown
            aria-hidden
            size={16}
            className="shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-open:rotate-180"
          />
        </span>
      </summary>
      <div className="px-4 pb-4">
        <p className="flex items-center gap-1.5 break-words text-sm text-muted-foreground">
          <FaLocationDot aria-hidden className="shrink-0" />
          <span>
            <span className="sr-only">{es.lugar}</span>
            {meeting.location}
          </span>
        </p>
        {meeting.notice ? (
          <div className="mt-3">
            <SpecialEventBanner
              event={meeting.notice.event}
              variant={meeting.notice.variant}
              showTuesdayNote={
                meeting.kind === "midweek" && meeting.notice.variant === "circuit-visit"
              }
              compact
            />
          </div>
        ) : null}
        <div className="mt-3">
          <HeroRows meeting={meeting} isMale={isMale} lead={false} />
        </div>
      </div>
    </details>
  );
}

export function MyWeekSection({ myWeek, canLinkAccount }: MyWeekSectionProps) {
  const today = todayLocalISO();
  const [lead, ...rest] = myWeek.meetings;
  return (
    <section aria-label={es.miSemana} className="section-stack">
      <h1 className="sr-only">{es.miSemana}</h1>
      {myWeek.personName ? (
        <p className="text-sm text-muted-foreground">
          {es.eres} <span className="font-medium text-foreground">{myWeek.personName}</span>
        </p>
      ) : (
        <EmptyState
          icon={<FaCircleUser aria-hidden size={22} />}
          title={es.usuarioNoVinculado}
          description={canLinkAccount ? undefined : es.pideAdminVinculo}
          action={
            canLinkAccount ? (
              <Link
                href="/administracion/personas"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 font-display text-sm font-medium text-accent-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {es.vincularEnPersonas}
              </Link>
            ) : undefined
          }
        />
      )}

      {lead ? <LeadHero meeting={lead} today={today} isMale={myWeek.isMale} /> : null}
      {!lead ? (
        <EmptyState
          icon={<FaCalendarCheck aria-hidden size={22} />}
          title={es.semanaVacia}
          action={
            <Link
              href="/reunioes"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-4 font-display text-sm font-medium text-secondary-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {es.verPrograma}
            </Link>
          }
        />
      ) : null}
      {rest.map((meeting) => (
        <MeetingAccordion
          key={`${meeting.date}-${meeting.kind}`}
          meeting={meeting}
          today={today}
          isMale={myWeek.isMale}
        />
      ))}

      <div className="tight-stack">
        <Link
          href="/reunioes"
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-6 font-display text-base font-semibold text-accent-ink shadow-[0_16px_40px_-16px_rgb(0_0_0/0.45)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <FaBookOpen aria-hidden size={18} />
          {es.verProgramaCompleto}
        </Link>
        <Link
          href="/designacoes"
          className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-secondary px-6 font-display text-sm font-semibold text-secondary-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <FaListOl aria-hidden size={18} />
          {es.verDiseniosLimpieza}
        </Link>
      </div>

      {myWeek.upcomingDuties.length > 0 && (
        <section aria-label={es.proximasEnLaReunion} className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground">{es.proximasEnLaReunion}</p>
          <ul className="flex flex-col rounded-2xl border border-border bg-card px-4 text-card-foreground shadow-sm">
            {myWeek.upcomingDuties.map((duty) => (
              <li
                key={`${duty.assignmentDate}-${duty.dutyKey}-${duty.sortOrder}`}
                className="flex items-center gap-2 border-b border-border py-2 text-sm last:border-b-0"
              >
                <DutyKeyIcon dutyKey={duty.dutyKey} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {formatWeekday(duty.assignmentDate)} {formatShortDay(duty.assignmentDate)} ·{" "}
                  {dutyLabel(duty.dutyKey, duty.postLabel)}
                  {duty.side ? (
                    <span className="font-normal text-muted-foreground"> · {duty.side}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

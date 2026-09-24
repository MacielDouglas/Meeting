import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import {
  getMeetingProgram,
  type MeetingAssignmentItem,
} from "@/features/meetings/application/meeting-queries";
import { listOutsideSpeakers } from "@/features/meetings/application/outside-speaker-queries";
import { sectionMetaOf } from "@/features/meetings/domain/section-meta";
import {
  blocksMeeting,
  resolveWeekOverrides,
} from "@/features/meetings/domain/special-event-weeks";
import { SpecialEventBanner } from "@/features/meetings/presentation/SpecialEventBanner";
import {
  getMeetingSchedule,
  listPublicSpecialEvents,
} from "@/features/settings/application/queries";
import { PageHeader } from "@/shared/components/PageHeader";
import { PrintButton } from "@/shared/components/PrintButton-client";
import { CardSkeleton, PageHeaderSkeleton } from "@/shared/components/skeletons";
import { es } from "@/shared/i18n/es";
import { formatDateBR } from "@/shared/lib/format-date";

export const metadata: Metadata = { title: es.impresionTitle };

const EXCEPTION_LABELS: Record<string, string> = {
  no_meeting: "Sin reunión",
  circuit_visit: "Visita del superintendente de circuito",
  convention: "Congreso",
  virtual_convention: "Congreso virtual",
  special: "Programa especial",
};

function currentMonday(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = (now.getDay() + 6) % 7;
  now.setDate(now.getDate() - diff);
  return now.toISOString().slice(0, 10);
}

function isValidWeek(value: string | undefined): value is string {
  return value !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function dateForWeekday(mondayISO: string, weekday: number): string {
  return addDaysISO(mondayISO, (weekday - 1 + 7) % 7);
}

interface ImprimirPageProps {
  searchParams?: Promise<{ kind?: string; week?: string; view?: string }>;
}

export default async function ImprimirPage({ searchParams }: ImprimirPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const params = (await searchParams) ?? {};
  const kind = params.kind === "weekend" ? "weekend" : "midweek";
  const weekStart = isValidWeek(params.week) ? params.week : currentMonday();

  if (params.view === "slips") {
    if (user.role !== "owner" && user.role !== "admin") redirect("/reunioes");
    const speakers = await listOutsideSpeakers();
    return (
      <main className="page-stack">
        <div className="print:hidden">
          <PageHeader
            title="Fichas de oradores"
            meta={`${speakers.length} orador(es)`}
            actions={
              <Suspense fallback={null}>
                <PrintButton />
              </Suspense>
            }
          />
        </div>
        <Suspense fallback={<PrintFallback />}>
          {speakers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ningún orador registrado.{" "}
              <Link href="/reunioes?tab=oradores" className="text-accent underline">
                Registrar oradores
              </Link>
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {speakers.map((speaker) => (
                <section key={speaker.id} className="rounded-xl border bg-white p-4 text-black">
                  <h2 className="text-base font-bold">{speaker.name}</h2>
                  <p className="text-sm text-neutral-600">{speaker.congregation || "—"}</p>
                  <p className="mt-2 text-sm">
                    {speaker.talkNumber ? `Discurso N.º ${speaker.talkNumber}` : "Discurso"}
                    {speaker.talkTheme ? ` — ${speaker.talkTheme}` : ""}
                  </p>
                  {speaker.phone && <p className="text-sm">Tel.: {speaker.phone}</p>}
                  {speaker.notes && (
                    <p className="mt-1 text-xs text-neutral-600">{speaker.notes}</p>
                  )}
                </section>
              ))}
            </div>
          )}
        </Suspense>
      </main>
    );
  }

  const [result, meetingScheduleData, weekEvents] = await Promise.all([
    getMeetingProgram(kind, weekStart),
    getMeetingSchedule(),
    listPublicSpecialEvents().catch(() => []),
  ]);

  const overrides = resolveWeekOverrides(
    {
      weekStart,
      weekEnd: addDaysISO(weekStart, 6),
      midweekDate: dateForWeekday(weekStart, meetingScheduleData.midweekDay),
      weekendDate: dateForWeekday(weekStart, meetingScheduleData.weekendDay),
    },
    weekEvents,
  );
  const override = kind === "midweek" ? overrides.midweek : overrides.weekend;
  const blocked = blocksMeeting(override);

  // Cabeçalho de seção derivado de forma pura (a primeira parte de cada seção
  // exibe a faixa colorida), calculado antes do JSX.
  const partsWithSections: (MeetingAssignmentItem & { showSection: boolean })[] = [];
  if (
    result !== null &&
    result.program.exceptionType !== "no_meeting" &&
    result.program.exceptionType !== "convention"
  ) {
    let lastSection = "";
    for (const part of result.assignments) {
      partsWithSections.push({
        ...part,
        showSection: part.section !== "" && part.section !== lastSection,
      });
      if (part.section !== "") lastSection = part.section;
    }
  }

  return (
    <main className="page-stack">
      <div className="print:hidden">
        <PageHeader
          title="Impresión del programa"
          meta={`${kind === "midweek" ? "Reunión entre semana" : "Reunión de fin de semana"} · semana del ${formatDateBR(weekStart)}`}
          actions={
            <>
              <Link
                href={`/api/reunioes/ical?kind=${kind}&week=${weekStart}`}
                className="flex h-11 items-center rounded-xl bg-secondary px-4 font-display text-sm font-medium text-secondary-foreground"
              >
                Descargar iCal
              </Link>
              <Suspense fallback={null}>
                <PrintButton />
              </Suspense>
            </>
          }
        />
      </div>

      <Suspense fallback={<PrintFallback />}>
        {blocked ? (
          <SpecialEventBanner event={override.event} variant={override.kind} />
        ) : (
          <>
            {override.kind !== "none" ? (
              <SpecialEventBanner
                event={override.event}
                variant={override.kind}
                showTuesdayNote={kind === "midweek" && override.kind === "circuit-visit"}
                compact
              />
            ) : null}
            {result === null ? (
              <p className="text-sm text-muted-foreground">
                Ningún programa guardado para esta semana.{" "}
                <Link href="/reunioes" className="text-accent underline">
                  Volver a Reuniones
                </Link>
              </p>
            ) : result.program.exceptionType === "no_meeting" ||
              result.program.exceptionType === "convention" ? (
              <section className="rounded-xl border p-6 text-center">
                <h2 className="text-xl font-bold">
                  {EXCEPTION_LABELS[result.program.exceptionType] ?? "Sin reunión"}
                </h2>
                {result.program.exceptionLabel && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {result.program.exceptionLabel}
                  </p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDateBR(result.program.date)}
                </p>
              </section>
            ) : (
              <article className="overflow-hidden rounded-xl border bg-white text-black">
                <header className="border-b p-4 text-center">
                  {meetingScheduleData.congregationName && (
                    <p className="text-lg font-bold">{meetingScheduleData.congregationName}</p>
                  )}
                  <h2 className="text-xl font-semibold">
                    {kind === "midweek" ? "Reunión entre semana" : "Reunión de fin de semana"}
                  </h2>
                  <p className="text-sm text-neutral-600">
                    {formatDateBR(result.program.date)}
                    {result.program.exceptionLabel
                      ? ` — ${EXCEPTION_LABELS[result.program.exceptionType] ?? result.program.exceptionType}: ${result.program.exceptionLabel}`
                      : ""}
                  </p>
                </header>
                {partsWithSections.map((part) => {
                  const meta = sectionMetaOf(part.section);
                  return (
                    <div key={part.id}>
                      {part.showSection && (
                        <h3
                          className="px-4 py-1 text-sm font-semibold text-white"
                          style={{ backgroundColor: meta.color }}
                        >
                          {meta.label}
                        </h3>
                      )}
                      <div className="flex items-center gap-3 border-b px-4 py-1.5 last:border-b-0">
                        <span className="w-12 shrink-0 text-xs font-semibold">
                          {part.startTime}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">
                            {part.songNumber
                              ? `Cántico ${part.songNumber}${/oraci[óo]n/i.test(part.title) ? " y oración" : ""}`
                              : part.title}
                            {part.durationMinutes ? ` (${part.durationMinutes} min)` : ""}
                            {part.classroom && part.classroom !== "A"
                              ? ` · Sala ${part.classroom}`
                              : ""}
                          </span>
                          {(part.subtitle || part.songTheme || part.speakerCongregation) && (
                            <span className="block truncate text-xs text-neutral-600">
                              {[part.subtitle || part.songTheme, part.speakerCongregation]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                        </span>
                        <span className="max-w-44 shrink-0 truncate text-right text-xs italic">
                          {part.personName}
                          {part.helperPersonName ? ` · ${part.helperPersonName}` : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </article>
            )}
          </>
        )}
      </Suspense>
    </main>
  );
}

function PrintFallback() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <PageHeaderSkeleton />
      <CardSkeleton />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import {
  getMeetingProgram,
  type MeetingAssignmentItem,
} from "@/features/meetings/application/meeting-queries";
import { listOutsideSpeakers } from "@/features/meetings/application/outside-speaker-queries";
import { PrintButton } from "@/shared/components/PrintButton-client";
import { CardSkeleton, PageHeaderSkeleton } from "@/shared/components/skeletons";

const SECTION_COLORS: Record<string, string> = {
  "TESOROS DE LA BIBLIA": "#656164",
  "SEAMOS MEJORES MAESTROS": "#c78909",
  "NUESTRA VIDA CRISTIANA": "#99131e",
  "PUBLIC TALK": "#2f4868",
  "ESTUDIO DE LA ATALAYA": "#4d654d",
};

const EXCEPTION_LABELS: Record<string, string> = {
  no_meeting: "Sem reunião",
  circuit_visit: "Visita do superintendente de circuito",
  convention: "Congresso",
  virtual_convention: "Congresso virtual",
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
    const speakers = await listOutsideSpeakers();
    return (
      <main className="flex flex-col gap-4 pb-10">
        <header className="flex items-center justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fichas de oradores</h1>
            <p className="text-sm text-muted-foreground">{speakers.length} orador(es)</p>
          </div>
          <Suspense fallback={null}>
            <PrintButton />
          </Suspense>
        </header>
        <Suspense fallback={<PrintFallback />}>
          {speakers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum orador cadastrado.{" "}
              <Link href="/reunioes?tab=oradores" className="text-sky-600 underline">
                Cadastrar oradores
              </Link>
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {speakers.map((speaker) => (
                <section key={speaker.id} className="rounded-xl border bg-white p-4 text-black">
                  <h2 className="text-base font-bold">{speaker.name}</h2>
                  <p className="text-sm text-neutral-600">{speaker.congregation || "—"}</p>
                  <p className="mt-2 text-sm">
                    {speaker.talkNumber ? `Discurso Nº ${speaker.talkNumber}` : "Discurso"}
                    {speaker.talkTheme ? ` — ${speaker.talkTheme}` : ""}
                  </p>
                  {speaker.phone && <p className="text-sm">Tel: {speaker.phone}</p>}
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

  const result = await getMeetingProgram(kind, weekStart);

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
    <main className="flex flex-col gap-4 pb-10">
      <header className="flex items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Impressão do programa</h1>
          <p className="text-sm text-muted-foreground">
            {kind === "midweek" ? "Reunião entre semana" : "Reunião de fim de semana"} · semana de{" "}
            {weekStart}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/api/reunioes/ical?kind=${kind}&week=${weekStart}`}
            className="flex h-9 items-center rounded-full bg-secondary px-4 text-sm font-medium"
          >
            Baixar iCal
          </Link>
          <Suspense fallback={null}>
            <PrintButton />
          </Suspense>
        </div>
      </header>

      <Suspense fallback={<PrintFallback />}>
        {result === null ? (
          <p className="text-sm text-muted-foreground">
            Nenhum programa salvo para esta semana.{" "}
            <Link href="/reunioes" className="text-sky-600 underline">
              Voltar para Reuniões
            </Link>
          </p>
        ) : result.program.exceptionType === "no_meeting" ||
          result.program.exceptionType === "convention" ? (
          <section className="rounded-xl border p-6 text-center">
            <h2 className="text-xl font-bold">
              {EXCEPTION_LABELS[result.program.exceptionType] ?? "Sem reunião"}
            </h2>
            {result.program.exceptionLabel && (
              <p className="mt-1 text-sm text-muted-foreground">{result.program.exceptionLabel}</p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">{result.program.date}</p>
          </section>
        ) : (
          <article className="overflow-hidden rounded-xl border bg-white text-black">
            <header className="border-b p-4 text-center">
              <h2 className="text-xl font-bold uppercase">
                {kind === "midweek" ? "Reunião entre semana" : "Reunião de fim de semana"}
              </h2>
              <p className="text-sm text-neutral-600">
                {result.program.date}
                {result.program.exceptionLabel
                  ? ` — ${EXCEPTION_LABELS[result.program.exceptionType] ?? result.program.exceptionType}: ${result.program.exceptionLabel}`
                  : ""}
              </p>
            </header>
            {partsWithSections.map((part) => {
              const color = SECTION_COLORS[part.section] ?? "#333333";
              return (
                <div key={part.id}>
                  {part.showSection && (
                    <h3
                      className="px-4 py-1 text-sm font-bold uppercase text-white"
                      style={{ backgroundColor: color }}
                    >
                      {part.section}
                    </h3>
                  )}
                  <div className="flex items-center gap-3 border-b px-4 py-1.5 last:border-b-0">
                    <span className="w-12 shrink-0 text-xs font-semibold">{part.startTime}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {part.songNumber ? `Cântico ${part.songNumber}` : part.title}
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

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/application/session";
import {
  getContentCounts,
  listOutlines,
  listSongs,
} from "@/features/meeting-content/application/queries";
import { listWatchtowerIssues } from "@/features/meeting-content/application/watchtower-queries";
import { ContentSection } from "@/features/meeting-content/presentation/ContentSection";
import { getWeeklySchedule } from "@/features/weekly-schedule/application/get-weekly-schedule";
import { Card, CardTitle } from "@/shared/components/ui/card";

type ReunioesTab = "reunioes" | "designacoes" | "conteudo";

const TABS: { value: ReunioesTab; label: string }[] = [
  { value: "reunioes", label: "Reuniões" },
  { value: "designacoes", label: "Designações" },
  { value: "conteudo", label: "Conteúdo" },
];

export default async function ReunioesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; reuniao?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const params = (await searchParams) ?? {};
  const tab: ReunioesTab =
    params.tab === "designacoes" || params.tab === "conteudo" ? params.tab : "reunioes";
  const canManage = user.role === "owner" || user.role === "admin";

  const [schedule, songs, outlines, counts, issues] = await Promise.all([
    getWeeklySchedule(),
    tab === "conteudo" ? listSongs() : Promise.resolve([]),
    tab === "conteudo" ? listOutlines() : Promise.resolve([]),
    tab === "conteudo"
      ? getContentCounts()
      : Promise.resolve({
          songsEs: 0,
          songsPt: 0,
          songsEn: 0,
          outlinesEs: 0,
          outlinesPt: 0,
          outlinesEn: 0,
        }),
    tab === "conteudo" ? listWatchtowerIssues() : Promise.resolve([]),
  ]);

  const meeting = params.reuniao === "fim-de-semana" ? schedule.weekend : schedule.midweek;

  return (
    <main className="flex flex-col gap-4 pb-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Reuniões</h1>
        <p className="text-sm text-muted-foreground">
          {schedule.weekStart} — {schedule.weekEnd}
        </p>
      </header>

      <nav className="flex gap-2" aria-label="Seções de reuniões">
        {TABS.map((item) => (
          <Link
            key={item.value}
            href={`/reunioes?tab=${item.value}`}
            className={`h-9 flex-1 rounded-full px-3 text-center text-sm font-medium leading-9 transition-colors ${
              tab === item.value ? "bg-sky-500 text-white" : "bg-secondary text-muted-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "reunioes" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Link
              href="/reunioes?tab=reunioes&reuniao=entre-semana"
              className={`h-9 flex-1 rounded-full px-3 text-center text-sm font-medium leading-9 ${
                meeting.kind === "midweek"
                  ? "bg-sky-500 text-white"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              Entre semana
            </Link>
            <Link
              href="/reunioes?tab=reunioes&reuniao=fim-de-semana"
              className={`h-9 flex-1 rounded-full px-3 text-center text-sm font-medium leading-9 ${
                meeting.kind === "weekend"
                  ? "bg-sky-500 text-white"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              Fim de semana
            </Link>
          </div>
          <Card className="flex flex-col gap-1">
            <CardTitle>{meeting.theme}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {meeting.date} · {meeting.time} · {meeting.location}
            </p>
            <p className="text-sm text-muted-foreground">
              Programa detalhado em breve. Use a aba Conteúdo para gerenciar cânticos e esboços.
            </p>
          </Card>
        </div>
      )}

      {tab === "designacoes" && (
        <Card className="flex flex-col gap-1">
          <CardTitle>Designações</CardTitle>
          <p className="text-sm text-muted-foreground">
            Em breve: designações da reunião entre semana e de fim de semana.
          </p>
        </Card>
      )}

      {tab === "conteudo" && (
        <ContentSection
          initialSongs={songs}
          initialOutlines={outlines}
          initialIssues={issues}
          counts={counts}
          canManage={canManage}
        />
      )}
    </main>
  );
}

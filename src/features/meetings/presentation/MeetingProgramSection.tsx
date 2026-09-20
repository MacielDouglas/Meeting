"use client";

import { useEffect, useMemo, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { JwpubImportButton } from "@/features/meeting-content/presentation/JwpubImportButton-client";
import { saveMeetingProgram } from "@/features/meetings/application/meeting-actions";
import {
  getMeetingProgram,
  type MeetingAssignmentItem,
} from "@/features/meetings/application/meeting-queries";
import {
  type BuiltPart,
  buildMidweekParts,
  buildWeekendParts,
  type WorkbookWeekLike,
} from "@/features/meetings/domain/build-meeting-program";
import {
  findWatchtowerArticleIndex,
  findWorkbookWeekIndex,
} from "@/features/meetings/domain/match-meeting-content";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { formatDateBR } from "@/shared/lib/format-date";
import { MeetingAssignModal } from "./MeetingAssignModal";

interface SongOption {
  number: number;
  theme: string;
}
interface OutlineOption {
  id: string;
  number: number;
  theme: string;
}
interface WorkbookOption {
  label: string;
  meeting: WorkbookWeekLike["meeting"];
  weekStart: string | null;
}
interface ArticleOption {
  id: string;
  label: string;
  title: string;
  openingSong: number | null;
  closingSong: number | null;
  weekStart: string | null;
  weekEnd: string | null;
}

interface MeetingProgramSectionProps {
  songs: SongOption[];
  outlines: OutlineOption[];
  workbooks: WorkbookOption[];
  articles: ArticleOption[];
  midweekTime: string;
  weekendTime: string;
  canManage: boolean;
  initialWeekStart: string;
  initialKind: "midweek" | "weekend";
}

function mondayOf(offsetWeeks: number): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay();
  const diff = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff + offsetWeeks * 7);
  return monday.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

const SECTION_STYLES: Record<string, { badge: string; title: string }> = {
  "TESOROS DE LA BIBLIA": { badge: "bg-cyan-400 text-black", title: "text-cyan-400" },
  "SEAMOS MEJORES MAESTROS": { badge: "bg-amber-400 text-black", title: "text-amber-400" },
  "NUESTRA VIDA CRISTIANA": { badge: "bg-red-300 text-black", title: "text-red-300" },
  "PUBLIC TALK": { badge: "bg-blue-300 text-black", title: "text-blue-300" },
  "ESTUDIO DE LA ATALAYA": { badge: "bg-green-500 text-black", title: "text-green-500" },
};

interface DisplayPart extends BuiltPart {
  id: string;
  personName: string;
  helperName: string;
  helperPersonName?: string;
  classroom: string;
  speakerCongregation: string;
}

export function MeetingProgramSection({
  songs,
  outlines,
  workbooks,
  articles,
  midweekTime,
  weekendTime,
  canManage,
  initialWeekStart,
  initialKind,
}: MeetingProgramSectionProps) {
  const [kind, setKind] = useState<"midweek" | "weekend">(initialKind);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(
    () => (weekOffset === 0 ? initialWeekStart : mondayOf(weekOffset)),
    [weekOffset, initialWeekStart],
  );
  const [workbookPick, setWorkbookPick] = useState<{ week: string; index: number } | null>(null);
  const [articlePick, setArticlePick] = useState<{ week: string; index: number } | null>(null);
  const [outlineId, setOutlineId] = useState<string>("");
  const [openingSong, setOpeningSong] = useState<string>("");
  const [saved, setSaved] = useState<MeetingAssignmentItem[] | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DisplayPart | null>(null);

  const songMap = useMemo(() => new Map(songs.map((s) => [s.number, s.theme])), [songs]);

  // Seleção inteligente: encontra exatamente a semana da apostila e o estudo
  // da Sentinela da semana do programa. Sem correspondência exata não há
  // default — a escolha manual ("Automático" volta ao modo exato) vale só para
  // a semana atual, sem vazar para outras semanas.
  const autoWorkbookIndex = useMemo(
    () => findWorkbookWeekIndex(workbooks, weekStart),
    [workbooks, weekStart],
  );
  const workbookIndex = workbookPick?.week === weekStart ? workbookPick.index : autoWorkbookIndex;
  const workbook = workbookIndex != null ? (workbooks[workbookIndex] ?? null) : null;

  const autoArticleIndex = useMemo(
    () => findWatchtowerArticleIndex(articles, weekStart),
    [articles, weekStart],
  );
  const articleIndex = articlePick?.week === weekStart ? articlePick.index : autoArticleIndex;
  const article = articleIndex != null ? (articles[articleIndex] ?? null) : null;

  // Discurso sem default: começa vazio ("Nenhum") e só assume valor por
  // escolha do usuário ou pelo programa salvo da semana.
  const outline = outlines.find((o) => o.id === outlineId) ?? null;

  const template: BuiltPart[] = useMemo(() => {
    if (kind === "midweek") {
      if (!workbook) return [];
      return buildMidweekParts({ meeting: workbook.meeting }, midweekTime, songMap);
    }
    if (!article) return [];
    return buildWeekendParts(
      weekendTime,
      openingSong ? Number(openingSong) : null,
      outline?.theme ?? "Discurso público",
      outline?.number ?? null,
      article,
      songMap,
    );
  }, [kind, workbook, midweekTime, weekendTime, openingSong, outline, article, songMap]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await getMeetingProgram(kind, weekStart);
        if (cancelled) return;
        setSaved(result?.assignments ?? null);
        setProgramId(result?.program.id ?? null);
        // Sincroniza o discurso com o programa salvo (ou volta a "Nenhum" em
        // semana sem programa, sem carregar escolha de outra semana).
        setOutlineId(result?.program.outlineId ?? "");
      } catch {
        if (!cancelled) setSaved(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [kind, weekStart]);

  const displayParts: DisplayPart[] = useMemo(() => {
    if (template.length === 0) {
      // Sem conteúdo importado (apostila/Sentinela apagada ou ausente): mostra o
      // programa salvo exatamente como está, mesmo sem modelo para mesclar.
      if (!saved || saved.length === 0) return [];
      return saved.map((s) => ({
        key: s.partKey,
        section: s.section,
        title: s.title,
        subtitle: s.subtitle,
        startTime: s.startTime,
        durationMinutes: s.durationMinutes,
        songNumber: s.songNumber,
        songTheme: s.songTheme,
        id: s.id,
        personName: s.personName ?? "",
        helperName: s.helperPersonName ?? "",
        helperPersonName: s.helperPersonName ?? "",
        classroom: s.classroom ?? "A",
        speakerCongregation: s.speakerCongregation ?? "",
      }));
    }
    if (!saved || saved.length === 0)
      return template.map((t, index) => ({
        ...t,
        id: `tpl-${index}`,
        personName: "",
        helperName: "",
        classroom: "A",
        speakerCongregation: "",
      }));
    const byKey = new Map(saved.map((a) => [a.partKey, a]));
    return template.map((t, index) => {
      const s = byKey.get(t.key);
      return {
        ...t,
        id: s?.id ?? `tpl-${index}`,
        personName: s?.personName ?? "",
        helperName: s?.helperPersonName ?? "",
        helperPersonName: s?.helperPersonName ?? "",
        classroom: s?.classroom ?? "A",
        speakerCongregation: s?.speakerCongregation ?? "",
        title: s?.title ?? t.title,
        subtitle: s?.subtitle ?? t.subtitle,
        songNumber: s?.songNumber ?? t.songNumber,
        songTheme: s?.songTheme ?? t.songTheme,
      };
    });
  }, [saved, template]);

  async function handleGenerate() {
    setSaving(true);
    setError(null);
    const date = kind === "midweek" ? addDays(weekStart, 3) : addDays(weekStart, 6);
    const result = await saveMeetingProgram(
      kind,
      weekStart,
      date,
      template.map((t) => ({
        partKey: t.key,
        section: t.section,
        title: t.title,
        subtitle: t.subtitle ?? "",
        startTime: t.startTime,
        durationMinutes: t.durationMinutes,
        songNumber: t.songNumber ?? null,
        songTheme: t.songTheme ?? "",
        classroom: "A" as const,
        study: "",
        source: "",
        notes: "",
        speakerCongregation: "",
      })),
      kind === "weekend" ? (outline?.id ?? null) : null,
      { exceptionType: "", exceptionLabel: "" },
    );
    if (!result.ok) {
      setError(result.error ?? "Erro ao gerar programa.");
      setSaving(false);
      return;
    }
    const fresh = await getMeetingProgram(kind, weekStart);
    setSaved(fresh?.assignments ?? null);
    setProgramId(fresh?.program.id ?? result.programId ?? null);
    setSaving(false);
  }

  async function refresh() {
    const fresh = await getMeetingProgram(kind, weekStart);
    setSaved(fresh?.assignments ?? null);
    setProgramId(fresh?.program.id ?? null);
  }

  // Calcula `showSection` fora do JSX de forma pura: a primeira parte de
  // cada seção exibe o cabeçalho, sem reatribuir variáveis durante o render.
  const displayPartsWithSections = useMemo(() => {
    const { parts } = displayParts.reduce<{
      parts: (DisplayPart & { showSection: boolean })[];
      last: string;
    }>(
      (acc, part) => ({
        last: part.section !== "" ? part.section : acc.last,
        parts: [
          ...acc.parts,
          { ...part, showSection: part.section !== "" && part.section !== acc.last },
        ],
      }),
      { parts: [], last: "" },
    );
    return parts;
  }, [displayParts]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setKind("midweek")}
          className={`h-9 flex-1 rounded-full text-sm font-medium ${kind === "midweek" ? "bg-sky-500 text-white" : "bg-secondary text-muted-foreground"}`}
        >
          Entre semana
        </button>
        <button
          type="button"
          onClick={() => setKind("weekend")}
          className={`h-9 flex-1 rounded-full text-sm font-medium ${kind === "weekend" ? "bg-sky-500 text-white" : "bg-secondary text-muted-foreground"}`}
        >
          Fim de semana
        </button>
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-background p-2">
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o - 1)}
          className="rounded-lg p-2 hover:bg-secondary"
          aria-label="Semana anterior"
        >
          <FaChevronLeft size={14} />
        </button>
        <p className="text-sm font-semibold">Semana começando {formatDateBR(weekStart)}</p>
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o + 1)}
          className="rounded-lg p-2 hover:bg-secondary"
          aria-label="Próxima semana"
        >
          <FaChevronRight size={14} />
        </button>
      </div>

      {kind === "midweek" && workbooks.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-muted-foreground">Semana da apostila</span>
          <select
            value={workbookPick?.week === weekStart ? String(workbookPick.index) : "auto"}
            onChange={(e) =>
              setWorkbookPick(
                e.target.value === "auto"
                  ? null
                  : { week: weekStart, index: Number(e.target.value) },
              )
            }
            className="h-9 rounded-lg bg-secondary px-2 text-sm"
          >
            <option value="auto">
              {autoWorkbookIndex != null
                ? "Automático (semana exata)"
                : "Automático (não encontrada)"}
            </option>
            {workbooks.map((w, i) => (
              <option key={w.label} value={i}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {kind === "weekend" && (
        <div className="grid grid-cols-1 gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Estudo da Atalaya da semana</span>
            <select
              value={articlePick?.week === weekStart ? String(articlePick.index) : "auto"}
              onChange={(e) =>
                setArticlePick(
                  e.target.value === "auto"
                    ? null
                    : { week: weekStart, index: Number(e.target.value) },
                )
              }
              className="h-9 rounded-lg bg-secondary px-2 text-sm"
            >
              <option value="auto">
                {autoArticleIndex != null
                  ? "Automático (estudo exato)"
                  : "Automático (não encontrado)"}
              </option>
              {articles.map((a, i) => (
                <option key={a.id} value={i}>
                  {a.label} — {a.title}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-muted-foreground">Cântico inicial (nº)</span>
              <input
                value={openingSong}
                onChange={(e) => setOpeningSong(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="Ex: 12"
                className="h-9 rounded-lg bg-secondary px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-muted-foreground">Discurso (esboço)</span>
              <select
                value={outlineId}
                onChange={(e) => setOutlineId(e.target.value)}
                className="h-9 rounded-lg bg-secondary px-2 text-sm"
              >
                <option value="">Nenhum</option>
                {outlines.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.number} — {o.theme}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {openingSong && (
            <p className="text-xs text-muted-foreground">
              Cântico {openingSong}: {songMap.get(Number(openingSong)) ?? "tema não encontrado"}
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      {canManage && (
        <Button disabled={saving || template.length === 0} onClick={() => void handleGenerate()}>
          {saving
            ? "Gerando…"
            : saved && saved.length > 0
              ? "Atualizar programa (mantém designações)"
              : "Gerar programa da semana"}
        </Button>
      )}
      {programId && (
        <div className="flex gap-2 text-xs">
          <a
            href={`/reunioes/imprimir?kind=${kind}&week=${weekStart}`}
            className="flex-1 rounded-full bg-secondary px-3 py-2 text-center font-medium text-muted-foreground"
          >
            Imprimir programa
          </a>
          <a
            href={`/api/reunioes/ical?kind=${kind}&week=${weekStart}`}
            className="flex-1 rounded-full bg-secondary px-3 py-2 text-center font-medium text-muted-foreground"
          >
            Baixar iCal
          </a>
        </div>
      )}
      {!canManage && (
        <p className="text-xs text-muted-foreground">
          Você tem acesso de leitura. As designações são feitas por owner/admin.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando programa…</p>
      ) : (
        <Card className="flex flex-col gap-1 bg-black p-2 text-white">
          <p className="px-1 text-sm font-semibold">
            {kind === "midweek" ? "REUNIÓN DE ENTRE SEMANA" : "REUNIÓN DEL FIN DE SEMANA"} ·{" "}
            {formatDateBR(weekStart)}
          </p>
          {displayPartsWithSections.map((part) => {
            const style = SECTION_STYLES[part.section];
            return (
              <div key={`${part.startTime}-${part.title}-${part.id}`}>
                {part.showSection && (
                  <div className="mt-2 flex items-center gap-2 px-1 py-1">
                    <span className={`text-sm font-bold ${style?.title ?? "text-white"}`}>
                      {part.section}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  disabled={!canManage || !programId}
                  onClick={() => setEditing(part)}
                  className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-white/10 disabled:cursor-default"
                >
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${style?.badge ?? "bg-white/20 text-white"}`}
                  >
                    {part.startTime}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {part.songNumber ? `Canción ${part.songNumber}` : part.title}
                      {part.durationMinutes ? ` (${part.durationMinutes} min)` : ""}
                      {part.classroom && part.classroom !== "A" ? ` · Sala ${part.classroom}` : ""}
                    </span>
                    {(part.subtitle || part.songTheme) && (
                      <span className="block truncate text-xs text-white/60">
                        {part.subtitle || part.songTheme}
                      </span>
                    )}
                  </span>
                  <span className="max-w-32 truncate text-right text-xs text-white/80">
                    {part.personName ? part.personName : "—"}
                    {part.helperName ? ` · ${part.helperName}` : ""}
                  </span>
                  <span aria-hidden>{canManage && programId ? "›" : ""}</span>
                </button>
              </div>
            );
          })}
          {displayParts.length === 0 && (
            <div className="flex flex-col gap-2 p-2">
              <p className="text-sm text-white/60">Programação de reunião não encontrada.</p>
              {canManage && <JwpubImportButton />}
            </div>
          )}
        </Card>
      )}

      {editing && !editing.id.startsWith("tpl-") && (
        <MeetingAssignModal
          assignmentId={editing.id}
          title={editing.title}
          capability={editing.capability}
          needsHelper={editing.needsHelper}
          isSong={Boolean(editing.songNumber || editing.key.includes("song"))}
          partKey={editing.key}
          classroom={editing.classroom}
          speakerCongregation={editing.speakerCongregation}
          songs={songs}
          currentPersonName={editing.personName ?? ""}
          currentHelperName={editing.helperPersonName ?? editing.helperName ?? ""}
          onClose={() => setEditing(null)}
          onUpdated={() => void refresh()}
        />
      )}
    </div>
  );
}

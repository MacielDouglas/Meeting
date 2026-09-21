"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { FaBookOpen, FaChevronLeft, FaChevronRight, FaMicrophone } from "react-icons/fa";
import { GiSheep } from "react-icons/gi";
import { IoDiamond } from "react-icons/io5";
import { LuWheat } from "react-icons/lu";
import { JwpubImportButton } from "@/features/meeting-content/presentation/JwpubImportButton-client";
import {
  saveMeetingProgram,
  updateMeetingAssignment,
  updateMeetingAssignmentDetails,
  updateMeetingSong,
} from "@/features/meetings/application/meeting-actions";
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
import { sectionMetaOf } from "@/features/meetings/domain/section-meta";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { formatDateBR } from "@/shared/lib/format-date";
import { MeetingAssignModal, type StagedChange } from "./MeetingAssignModal";

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
  midweekDay: number;
  weekendDay: number;
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

const SECTION_ICONS: Record<string, IconType> = {
  "TESOROS DE LA BIBLIA": IoDiamond,
  "SEAMOS MEJORES MAESTROS": LuWheat,
  "NUESTRA VIDA CRISTIANA": GiSheep,
  "PUBLIC TALK": FaMicrophone,
  "ESTUDIO DE LA ATALAYA": FaBookOpen,
};

const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

interface PartDisplay {
  title: string;
  subtitle: string;
  line1: string;
  line2: string;
}

/** Título, subtítulo e linhas de designação de uma parte (função pura). */
function describePart(part: DisplayPart): PartDisplay {
  // O último cântico carrega "y oración" no título do modelo
  // ("Canción 129 y oración"); preserva o sufixo ao exibir o número.
  const prayerSuffix = /oraci[óo]n/i.test(part.title) ? " y oración" : "";
  const title = `${part.songNumber ? `Canción ${part.songNumber}${prayerSuffix}` : part.title}${
    part.durationMinutes ? ` (${part.durationMinutes} min)` : ""
  }${part.classroom && part.classroom !== "A" ? ` · Sala ${part.classroom}` : ""}`;
  const subtitle = part.subtitle || part.songTheme || "";
  const person = part.personName || "";
  const helper = part.helperName || "";
  if (part.key === "public-talk") {
    return {
      title,
      subtitle,
      line1: person || "—",
      line2: part.speakerCongregation ? `(${part.speakerCongregation})` : "",
    };
  }
  if (part.capability === "watchtowerStudy" || part.capability === "congregationStudy") {
    return {
      title,
      subtitle,
      line1: person ? `${person} (Conductor)` : "—",
      line2: helper ? `${helper} (Lector)` : "",
    };
  }
  if (helper) {
    return { title, subtitle, line1: person || "—", line2: `${helper} (Ajudante)` };
  }
  return { title, subtitle, line1: person || "—", line2: "" };
}

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
  midweekDay,
  weekendDay,
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
  const [outlineId, setOutlineId] = useState<string>("");
  const [saved, setSaved] = useState<MeetingAssignmentItem[] | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);
  const [programException, setProgramException] = useState({
    exceptionType: "",
    exceptionLabel: "",
  });
  // Alterações preparadas pelo usuário (clique nas partes); só persistem no Salvar.
  const [pending, setPending] = useState<Record<string, StagedChange>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DisplayPart | null>(null);
  const [initializedKey, setInitializedKey] = useState<string | null>(null);
  const autoSaveKeyRef = useRef<string | null>(null);
  const syncKeyRef = useRef<string | null>(null);

  const songMap = useMemo(() => new Map(songs.map((s) => [s.number, s.theme])), [songs]);
  // Seleção inteligente e totalmente automática: encontra exatamente a semana
  // da apostila e o estudo da Sentinela da semana do programa. Sem
  // correspondência exata não há default.
  const workbookIndex = useMemo(
    () => findWorkbookWeekIndex(workbooks, weekStart),
    [workbooks, weekStart],
  );
  const workbook = workbookIndex != null ? (workbooks[workbookIndex] ?? null) : null;

  const articleIndex = useMemo(
    () => findWatchtowerArticleIndex(articles, weekStart),
    [articles, weekStart],
  );
  const article = articleIndex != null ? (articles[articleIndex] ?? null) : null;

  // Discurso sem default: começa vazio ("Nenhum") e só assume valor pelo
  // programa salvo da semana.
  const outline = useMemo(
    () => outlines.find((o) => o.id === outlineId) ?? null,
    [outlines, outlineId],
  );

  // Cabeçalho da lista: dia da semana | nome da reunião + leitura semanal.
  const meetingDay = kind === "midweek" ? midweekDay : weekendDay;
  const meetingDayName = WEEKDAY_NAMES[meetingDay] ?? "";
  const meetingTitle = kind === "midweek" ? "REUNIÓN DE ENTRE SEMANA" : "REUNIÓN DEL FIN DE SEMANA";
  const weekBibleReading = useMemo(() => {
    const index = findWorkbookWeekIndex(workbooks, weekStart);
    const matched = index != null ? workbooks[index] : null;
    return matched?.meeting.BibleReading ?? "";
  }, [workbooks, weekStart]);

  const template: BuiltPart[] = useMemo(() => {
    if (kind === "midweek") {
      if (!workbook) return [];
      return buildMidweekParts({ meeting: workbook.meeting }, midweekTime, songMap);
    }
    if (!article) return [];
    return buildWeekendParts(
      weekendTime,
      null,
      outline?.theme ?? "Discurso público",
      outline?.number ?? null,
      article,
      songMap,
    );
  }, [kind, workbook, midweekTime, weekendTime, outline, article, songMap]);

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
        setProgramException({
          exceptionType: result?.program.exceptionType ?? "",
          exceptionLabel: result?.program.exceptionLabel ?? "",
        });
        // Sincroniza o discurso com o programa salvo (ou volta a "Nenhum" em
        // semana sem programa, sem carregar escolha de outra semana).
        setOutlineId(result?.program.outlineId ?? "");
        setPending({});
        setInitializedKey(`${kind}:${weekStart}`);
      } catch {
        if (!cancelled) {
          setSaved(null);
          setInitializedKey(`${kind}:${weekStart}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [kind, weekStart]);

  // Geração automática: sem botão Gerar — o programa da semana se materializa
  // sozinho (upsert não-destrutivo) quando há conteúdo e ainda não foi salvo.
  useEffect(() => {
    if (!canManage || template.length === 0 || loading) return;
    if (programId) return;
    if (initializedKey !== `${kind}:${weekStart}`) return;
    const key = `${kind}:${weekStart}`;
    if (autoSaveKeyRef.current === key) return;
    autoSaveKeyRef.current = key;
    void (async () => {
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
    })();
  }, [canManage, template, programId, loading, initializedKey, kind, weekStart, outline]);

  // Sincronização do modelo: programas salvos antes de uma mudança no modelo
  // (ex.: nova parte "president", conselheiros removidos) ganham as partes
  // novas e perdem as removidas via upsert não-destrutivo, preservando as
  // designações e a exceção. Sem isso as partes novas ficam com id "tpl-*
  // e o modal de designação não abre (caso do Presidente).
  useEffect(() => {
    if (!canManage || template.length === 0 || loading) return;
    if (!programId || !saved) return;
    if (initializedKey !== `${kind}:${weekStart}`) return;
    const templateKeys = [...template.map((t) => t.key)].sort().join("|");
    const savedKeys = [...saved.map((s) => s.partKey)].sort().join("|");
    if (templateKeys === savedKeys) return;
    const key = `sync:${kind}:${weekStart}:${templateKeys}`;
    if (syncKeyRef.current === key) return;
    syncKeyRef.current = key;
    void (async () => {
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
        {
          exceptionType: programException.exceptionType as
            | ""
            | "no_meeting"
            | "circuit_visit"
            | "convention"
            | "virtual_convention"
            | "special",
          exceptionLabel: programException.exceptionLabel,
        },
      );
      if (!result.ok) {
        setError(result.error ?? "Erro ao sincronizar programa.");
        setSaving(false);
        return;
      }
      const fresh = await getMeetingProgram(kind, weekStart);
      setSaved(fresh?.assignments ?? null);
      setProgramId(fresh?.program.id ?? result.programId ?? null);
      setSaving(false);
    })();
  }, [
    canManage,
    template,
    programId,
    saved,
    loading,
    initializedKey,
    kind,
    weekStart,
    outline,
    programException,
  ]);

  const displayParts: DisplayPart[] = useMemo(() => {
    // Sobrepõe as alterações preparadas (staged) sobre o valor salvo.
    const applyPending = (base: DisplayPart): DisplayPart => {
      const change = pending[base.id];
      if (!change || base.id.startsWith("tpl-")) return base;
      return {
        ...base,
        personName: change.personName ?? base.personName,
        helperName: change.helperPersonName ?? base.helperName,
        helperPersonName: change.helperPersonName ?? base.helperPersonName,
        songNumber: change.songNumber ?? base.songNumber,
        songTheme: change.songTheme ?? base.songTheme,
        classroom: change.classroom ?? base.classroom,
        speakerCongregation: change.speakerCongregation ?? base.speakerCongregation,
      };
    };
    if (template.length === 0) {
      // Sem conteúdo importado (apostila/Sentinela apagada ou ausente): mostra o
      // programa salvo exatamente como está, mesmo sem modelo para mesclar.
      if (!saved || saved.length === 0) return [];
      return saved.map((s) =>
        applyPending({
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
        }),
      );
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
      return applyPending({
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
      });
    });
  }, [saved, template, pending]);

  const dirtyIds = useMemo(() => new Set(Object.keys(pending)), [pending]);

  function handleStage(assignmentId: string, change: StagedChange) {
    setPending((previous) => ({
      ...previous,
      [assignmentId]: { ...previous[assignmentId], ...change },
    }));
  }

  async function handleSaveAll() {
    setSaving(true);
    setError(null);
    try {
      for (const [assignmentId, change] of Object.entries(pending)) {
        if (change.personId !== undefined) {
          const result = await updateMeetingAssignment(
            assignmentId,
            change.personId,
            change.helperPersonId,
          );
          if (!result.ok) throw new Error(result.error ?? "Erro ao salvar.");
        }
        if (change.songNumber !== undefined && change.songNumber !== null) {
          const result = await updateMeetingSong(
            assignmentId,
            change.songNumber,
            change.songTheme ?? "",
          );
          if (!result.ok) throw new Error(result.error ?? "Erro ao salvar.");
        }
        const details: { classroom?: "A" | "B" | "C"; speakerCongregation?: string } = {};
        if (change.classroom !== undefined) details.classroom = change.classroom;
        if (change.speakerCongregation !== undefined)
          details.speakerCongregation = change.speakerCongregation;
        if (Object.keys(details).length > 0) {
          const result = await updateMeetingAssignmentDetails({ assignmentId, ...details });
          if (!result.ok) throw new Error(result.error ?? "Erro ao salvar.");
        }
      }
      setPending({});
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancelAll() {
    setPending({});
    setError(null);
  }

  async function refresh() {
    const fresh = await getMeetingProgram(kind, weekStart);
    setSaved(fresh?.assignments ?? null);
    setProgramId(fresh?.program.id ?? null);
    setProgramException({
      exceptionType: fresh?.program.exceptionType ?? "",
      exceptionLabel: fresh?.program.exceptionLabel ?? "",
    });
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

  // Linhas de designação por parte (orador + congregação, condutor + leitor,
  // titular + ajudante), como no app de referência.
  const partDisplay = useMemo(() => {
    return new Map(displayPartsWithSections.map((part) => [part.id, describePart(part)]));
  }, [displayPartsWithSections]);

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
        <div className="flex flex-col items-center">
          <p className="text-sm font-semibold">Semana começando {formatDateBR(weekStart)}</p>
          {weekBibleReading && (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {weekBibleReading}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o + 1)}
          className="rounded-lg p-2 hover:bg-secondary"
          aria-label="Próxima semana"
        >
          <FaChevronRight size={14} />
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
      {saving && !programId && <p className="text-xs text-muted-foreground">Salvando programa…</p>}
      {!canManage && (
        <p className="text-xs text-muted-foreground">
          Você tem acesso de leitura. As designações são feitas por owner/admin.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando programa…</p>
      ) : (
        <Card className="flex flex-col gap-0.5 overflow-hidden bg-black p-2 text-white">
          <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-white/60">
            {meetingDayName} | {meetingTitle}
          </p>
          {displayPartsWithSections.map((part, index) => {
            const meta = sectionMetaOf(part.section);
            const SectionIcon = SECTION_ICONS[part.section] ?? FaBookOpen;
            const display = partDisplay.get(part.id);
            if (!display) return null;
            return (
              <div key={`${part.startTime}-${part.title}-${part.id}`}>
                {part.showSection && (
                  <div
                    className={`-mx-2 flex items-center gap-2 px-3 py-1.5 ${index === 0 ? "" : "mt-2"}`}
                    style={{ backgroundColor: meta.color }}
                  >
                    <SectionIcon aria-hidden size={15} className="shrink-0 text-white" />
                    <span className="text-sm font-bold uppercase tracking-wide text-white">
                      {meta.label}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  disabled={!canManage || !programId || saving}
                  onClick={() => setEditing(part)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-1 py-2 text-left hover:bg-white/10 disabled:cursor-default"
                >
                  {dirtyIds.has(part.id) && (
                    <span
                      title="Alteração não salva"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
                    />
                  )}
                  <span
                    className="shrink-0 rounded px-1.5 py-1 text-xs font-bold text-white"
                    style={{ backgroundColor: meta.color }}
                  >
                    {part.startTime}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-snug text-white line-clamp-2">
                      {display.title}
                    </span>
                    {display.subtitle && (
                      <span className="block truncate text-xs text-white/55">
                        {display.subtitle}
                      </span>
                    )}
                  </span>
                  <span className="max-w-36 shrink-0 text-right">
                    <span className="block truncate text-xs text-white/85">{display.line1}</span>
                    {display.line2 && (
                      <span className="block truncate text-xs text-white/55">{display.line2}</span>
                    )}
                  </span>
                  {canManage && programId ? (
                    <span aria-hidden className="shrink-0 text-white/50">
                      ›
                    </span>
                  ) : null}
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

      {canManage && dirtyIds.size > 0 && (
        <div className="flex gap-2">
          <Button disabled={saving} onClick={() => void handleSaveAll()} className="flex-1">
            {saving ? "Salvando…" : `Salvar alterações (${dirtyIds.size})`}
          </Button>
          <Button variant="outline" disabled={saving} onClick={handleCancelAll} className="flex-1">
            Cancelar
          </Button>
        </div>
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

      {editing && !editing.id.startsWith("tpl-") && (
        <MeetingAssignModal
          title={editing.title}
          capability={editing.capability}
          needsHelper={editing.needsHelper}
          isSong={Boolean(editing.songNumber || editing.key.includes("song"))}
          // Só partes com capability permitem escolher pessoa (cântico inicial,
          // palavras de introdução e cântico do meio ficam só com o cântico).
          // O cântico da Atalaia continua só com o cântico.
          allowPerson={editing.key !== "watchtower-song" && Boolean(editing.capability)}
          partKey={editing.key}
          classroom={editing.classroom}
          speakerCongregation={editing.speakerCongregation}
          songs={songs}
          currentPersonName={editing.personName ?? ""}
          currentHelperName={editing.helperPersonName ?? editing.helperName ?? ""}
          onClose={() => setEditing(null)}
          onStage={(change) => handleStage(editing.id, change)}
        />
      )}
    </div>
  );
}

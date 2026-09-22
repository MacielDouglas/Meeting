"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  FaBookOpen,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaMicrophone,
} from "react-icons/fa";
import { GiSheep } from "react-icons/gi";
import { IoDiamond } from "react-icons/io5";
import { LuWheat } from "react-icons/lu";

// Importação .jwpub (Atalaya/Guia) só no estado vazio: fora do bundle inicial.
const JwpubImportButton = dynamic(
  () =>
    import("@/features/meeting-content/presentation/JwpubImportButton-client").then(
      (module) => module.JwpubImportButton,
    ),
  { ssr: false },
);

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
import { es } from "@/shared/i18n/es";
import { MeetingAssignModal, type StagedChange } from "./MeetingAssignModal";
import { PdfExportModal } from "./PdfExportModal-client";

interface SongOption {
  number: number;
  theme: string;
}
interface OutlineOption {
  id: string;
  number: number;
  theme: string;
  language: string;
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
  congregationName: string;
}

function mondayOf(offsetWeeks: number): string {
  // Meio-dia local: evita deriva de fuso do toISOString na virada do dia.
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const day = now.getDay();
  const diff = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff + offsetWeeks * 7);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
}

const MES_CORTO = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** Intervalo da semana: "12 – 18 ene" ou "28 ene – 3 feb". */
function formatWeekRange(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const [, sm, sd] = weekStart.split("-").map(Number);
  const [, em, ed] = end.split("-").map(Number);
  const startDay = String(sd).padStart(2, "0");
  const endDay = String(ed).padStart(2, "0");
  if (sm === em) return `${startDay} – ${endDay} ${MES_CORTO[sm - 1]}`;
  return `${startDay} ${MES_CORTO[sm - 1]} – ${endDay} ${MES_CORTO[em - 1]}`;
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

/** Partes fixas: só leitura, sem botão de designação. */
const ALWAYS_DISPLAY_ONLY_KEYS = new Set([
  "opening-comments",
  "middle-song",
  "concluding-comments",
  "watchtower-song",
  "closing-song",
]);

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
    return { title, subtitle, line1: person || "—", line2: `${helper} (Ayudante)` };
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
  congregationName,
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
  // Esboço do fim de semana também encena antes de salvar (mesmo modelo mental).
  // A escolha nasce no modal do discurso público; o topo não seleciona mais.
  const [pendingOutlineId, setPendingOutlineId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ done: number; total: number } | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DisplayPart | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);

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
  // programa salvo da semana. A escolha encenada prevalece até o Salvar.
  const effectiveOutlineId = pendingOutlineId ?? outlineId;
  const outline = useMemo(
    () => outlines.find((o) => o.id === effectiveOutlineId) ?? null,
    [outlines, effectiveOutlineId],
  );

  // Cabeçalho da lista: dia da semana | nome da reunião + leitura semanal.
  const meetingDay = kind === "midweek" ? midweekDay : weekendDay;
  const meetingDayName = WEEKDAY_NAMES[meetingDay] ?? "";
  const meetingTitle = kind === "midweek" ? "Reunión de entre semana" : "Reunión del fin de semana";
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
        setPendingOutlineId(null);
      } catch {
        if (!cancelled) {
          setSaved(null);
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

  // Leitura estrita: ver nunca escreve. Criação e sincronização do modelo
  // exigem ação explícita do organizador (botões abaixo).
  function buildTemplatePayload() {
    const date = kind === "midweek" ? addDays(weekStart, 3) : addDays(weekStart, 6);
    return {
      date,
      parts: template.map((t) => ({
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
      outlineId: kind === "weekend" ? (outline?.id ?? null) : null,
    };
  }

  /** Cria o programa da semana a partir do modelo (upsert não-destrutivo). */
  async function handleCreateProgram() {
    if (!canManage || template.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    setJustSaved(false);
    const payload = buildTemplatePayload();
    const result = await saveMeetingProgram(
      kind,
      weekStart,
      payload.date,
      payload.parts,
      payload.outlineId,
      { exceptionType: "", exceptionLabel: "" },
    );
    if (!result.ok) {
      setError(result.error ?? es.errorGuardar);
      setSaving(false);
      return;
    }
    setOutlineId(pendingOutlineId ?? outlineId);
    setPendingOutlineId(null);
    await refresh();
    setSaving(false);
  }

  // Programas salvos antes de uma mudança no modelo (ex.: nova parte
  // "president") ganham as partes novas via upsert não-destrutivo, preservando
  // designações e exceção — mas só com confirmação explícita.
  const templateKeys = useMemo(
    () =>
      template
        .map((t) => t.key)
        .sort()
        .join("|"),
    [template],
  );
  const savedKeys = useMemo(
    () =>
      (saved ?? [])
        .map((s) => s.partKey)
        .sort()
        .join("|"),
    [saved],
  );
  const modelSyncAvailable =
    canManage &&
    programId !== null &&
    template.length > 0 &&
    saved !== null &&
    templateKeys !== savedKeys;

  /** Sincroniza o programa com o modelo atual, sem perder designações. */
  async function handleSyncModel() {
    if (!canManage || !programId || template.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    const payload = buildTemplatePayload();
    const result = await saveMeetingProgram(
      kind,
      weekStart,
      payload.date,
      payload.parts,
      payload.outlineId,
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
      setError(result.error ?? es.errorSincronizar);
      setSaving(false);
      return;
    }
    await refresh();
    setSaving(false);
  }

  /** Trocar de reunião/semana com pendências pede confirmação (nada se perde em silêncio). */
  function confirmNavigate(): boolean {
    if (dirtyIds.size === 0 && pendingOutlineId === null) return true;
    return window.confirm(es.descartarCambioSemana);
  }

  function handleKindChange(next: "midweek" | "weekend") {
    if (next === kind || !confirmNavigate()) return;
    setKind(next);
  }

  function handleWeekStep(delta: number) {
    if (!confirmNavigate()) return;
    setWeekOffset((offset) => offset + delta);
  }

  function handleGoToday() {
    if (!confirmNavigate()) return;
    setWeekOffset(0);
  }

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
  const dirtyCount = dirtyIds.size + (pendingOutlineId !== null ? 1 : 0);

  // Resumo legível do que vai salvar ("Oración → García"), sem jargão de ids.
  const dirtySummary = useMemo(() => {
    const items = Object.keys(pending).map((id) => {
      const part = displayParts.find((d) => d.id === id);
      const change = pending[id];
      const name =
        change.personName || (change.songNumber ? `Canción ${change.songNumber}` : "") || "—";
      return `${part?.title ?? id} → ${name}`;
    });
    if (pendingOutlineId !== null) {
      const staged = outlines.find((o) => o.id === pendingOutlineId) ?? null;
      items.unshift(`${es.esboco} → ${staged ? `${staged.number} — ${staged.theme}` : es.nenhum}`);
    }
    if (items.length <= 2) return items.join(" · ");
    return `${items.slice(0, 2).join(" · ")} · +${items.length - 2} más`;
  }, [pending, pendingOutlineId, outlines, displayParts]);

  function handleStage(assignmentId: string, change: StagedChange) {
    setPending((previous) => ({
      ...previous,
      [assignmentId]: { ...previous[assignmentId], ...change },
    }));
  }

  async function handleSaveAll() {
    const entries = Object.entries(pending);
    const total = entries.length + (pendingOutlineId !== null ? 1 : 0);
    setSaving(true);
    setSaveProgress({ done: 0, total });
    setJustSaved(false);
    setError(null);
    try {
      let done = 0;
      // O esboço encenado salva junto (mesmo modelo mental das pessoas).
      if (pendingOutlineId !== null) {
        const staged = outlines.find((o) => o.id === pendingOutlineId) ?? null;
        const talk = saved?.find((assignment) => assignment.partKey === "public-talk");
        if (!talk) throw new Error(es.errorGuardar);
        const title = staged ? `${staged.theme} (${staged.number})` : "Discurso público";
        const outlineResult = await updateMeetingAssignmentDetails({
          assignmentId: talk.id,
          title,
        });
        if (!outlineResult.ok) throw new Error(outlineResult.error ?? es.errorGuardar);
        setOutlineId(pendingOutlineId);
        setPendingOutlineId(null);
        done += 1;
        setSaveProgress({ done, total });
      }
      for (const [assignmentId, change] of entries) {
        if (change.speakerName !== undefined) {
          const result = await updateMeetingAssignmentDetails({
            assignmentId,
            speakerName: change.speakerName,
            ...(change.speakerCongregation !== undefined
              ? { speakerCongregation: change.speakerCongregation }
              : {}),
          });
          if (!result.ok) throw new Error(result.error ?? es.errorGuardar);
        } else if (change.personId !== undefined) {
          const result = await updateMeetingAssignment(
            assignmentId,
            change.personId,
            change.helperPersonId,
          );
          if (!result.ok) throw new Error(result.error ?? es.errorGuardar);
        }
        if (change.songNumber !== undefined && change.songNumber !== null) {
          const result = await updateMeetingSong(
            assignmentId,
            change.songNumber,
            change.songTheme ?? "",
          );
          if (!result.ok) throw new Error(result.error ?? es.errorGuardar);
        }
        const details: { classroom?: "A" | "B" | "C"; speakerCongregation?: string } = {};
        if (change.classroom !== undefined) details.classroom = change.classroom;
        if (change.speakerCongregation !== undefined)
          details.speakerCongregation = change.speakerCongregation;
        if (Object.keys(details).length > 0) {
          const result = await updateMeetingAssignmentDetails({ assignmentId, ...details });
          if (!result.ok) throw new Error(result.error ?? es.errorGuardar);
        }
        done += 1;
        setSaveProgress({ done, total: entries.length });
      }
      setPending({});
      await refresh();
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 6000);
    } catch (error) {
      setError(error instanceof Error ? error.message : es.errorGuardar);
    } finally {
      setSaving(false);
      setSaveProgress(null);
    }
  }

  function handleCancelAll() {
    setPending({});
    setPendingOutlineId(null);
    setError(null);
  }

  /**
   * Confirmação do modal do discurso: mesma escolha vale para título salvo e
   * modelo da semana; sem mudança real, nada encena.
   */
  function handlePublicTalkOutline(id: string) {
    setPendingOutlineId(id === outlineId ? null : id);
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

  /** "N/M asignadas": o que falta grita no header, não em 15 linhas iguais. */
  const assignmentProgress = useMemo(() => {
    // Só partes designáveis entram no progresso (mesma regra da
    // interatividade, sem o bloqueio de `saving` para o número não piscar).
    const countable = (part: DisplayPart): boolean =>
      canManage &&
      programId !== null &&
      !ALWAYS_DISPLAY_ONLY_KEYS.has(part.key) &&
      !(kind === "midweek" && part.key === "opening-song");
    let assigned = 0;
    let total = 0;
    for (const part of displayPartsWithSections) {
      if (!countable(part)) continue;
      total += 1;
      const display = partDisplay.get(part.id);
      if (display && (display.line1 !== "—" || display.line2 !== "")) assigned += 1;
    }
    return { assigned, total };
  }, [displayPartsWithSections, partDisplay, canManage, programId, kind]);

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex rounded-xl bg-secondary p-1">
        <legend className="sr-only">{es.tipoReunion}</legend>
        {(
          [
            { value: "midweek", label: es.entreSemana },
            { value: "weekend", label: es.finSemana },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={kind === option.value}
            onClick={() => handleKindChange(option.value)}
            className={`h-8 flex-1 rounded-lg font-display text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
              kind === option.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleWeekStep(-1)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-input bg-background transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label={es.semanaAnterior}
        >
          <FaChevronLeft size={16} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
          <p className="truncate font-display text-2xl font-semibold leading-none tracking-tight">
            {formatWeekRange(weekStart)}
          </p>
          <p className="truncate text-sm font-medium text-muted-foreground">
            {kind === "midweek" ? es.entreSemana : es.finSemana} ·{" "}
            {WEEKDAY_NAMES[kind === "midweek" ? midweekDay : weekendDay]?.slice(0, 3)}{" "}
            {kind === "midweek" ? midweekTime : weekendTime}
            {weekBibleReading ? ` · ${weekBibleReading}` : ""}
          </p>
        </div>
        {weekOffset !== 0 && (
          <button
            type="button"
            onClick={handleGoToday}
            className="h-11 shrink-0 px-2 text-sm font-medium text-accent transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {es.hoy}
          </button>
        )}
        <button
          type="button"
          onClick={() => handleWeekStep(1)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-input bg-background transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label={es.semanaSiguiente}
        >
          <FaChevronRight size={16} />
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {modelSyncAvailable && !loading && (
        <div role="status" className="rounded-xl border border-warning/30 bg-warning-soft p-3">
          <p className="text-sm text-warning">{es.modeloCambiado}</p>
          <div className="mt-2">
            <Button size="sm" disabled={saving} onClick={() => void handleSyncModel()}>
              {saving ? es.guardando : es.sincronizar}
            </Button>
          </div>
        </div>
      )}
      {saving && !programId && (
        <p className="text-xs text-muted-foreground">{es.guardandoPrograma}</p>
      )}
      {!canManage && <p className="text-xs text-muted-foreground">{es.soloLectura}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">{es.cargandoPrograma}</p>
      ) : programId === null ? (
        <Card className="flex flex-col overflow-hidden border-0 bg-session p-0 text-session-fg shadow-none">
          <div className="flex flex-col gap-2 px-0 py-4">
            <p className="text-sm font-medium text-session-fg">{es.programaNoEncontrado}</p>
            {canManage && template.length > 0 && (
              <div>
                <Button disabled={saving} onClick={() => void handleCreateProgram()}>
                  {saving ? es.guardandoPrograma : es.crearProgramaSemana}
                </Button>
              </div>
            )}
            {template.length === 0 && (
              <>
                <p className="text-sm text-session-mute">{es.importarGuiaHint}</p>
                {canManage && <JwpubImportButton />}
              </>
            )}
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col overflow-visible border-0 bg-session p-0 text-session-fg shadow-none">
          <div className="sticky top-0 z-10 flex items-baseline justify-between gap-2 border-b border-session-line bg-session px-0 py-2">
            <p className="text-sm font-medium text-session-mute">
              {meetingDayName} · {meetingTitle}
            </p>
            <p className="shrink-0 text-sm font-medium tabular-nums text-session-mute">
              {assignmentProgress.assigned}/{assignmentProgress.total} {es.asignadas}
            </p>
          </div>
          <div className="flex flex-col divide-y divide-session-line">
            {displayPartsWithSections.map((part, index) => {
              const meta = sectionMetaOf(part.section);
              const SectionIcon = SECTION_ICONS[part.section] ?? FaBookOpen;
              const display = partDisplay.get(part.id);
              if (!display) return null;
              const isSongPart = part.key.includes("song") || part.songNumber != null;
              const interactive =
                canManage &&
                programId !== null &&
                !saving &&
                !ALWAYS_DISPLAY_ONLY_KEYS.has(part.key) &&
                !(kind === "midweek" && part.key === "opening-song");
              const isDirty = dirtyIds.has(part.id);
              const infoBits = [display.subtitle].filter(Boolean);
              const hasAssignee = display.line1 !== "—" || display.line2 !== "";
              // Nomes só aparecem com designado; cânticos nunca mostram "Sin asignar".
              const showNames = hasAssignee || (!isSongPart && interactive);
              const names = hasAssignee
                ? `${display.line1}${display.line2 ? ` · ${display.line2}` : ""}`
                : es.sinAsignar;
              const rowContent = (
                <>
                  <span className="flex w-11 shrink-0 flex-col items-center gap-0.5 pt-0.5">
                    {isDirty && (
                      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning">
                        <span className="sr-only">{es.sinGuardar}</span>
                      </span>
                    )}
                    <FaClock aria-hidden size={16} className="shrink-0 text-session-faint" />
                    <span className="text-xs font-semibold tabular-nums text-session-mute">
                      {part.startTime}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={
                        part.key === "public-talk"
                          ? "block truncate text-base font-bold"
                          : "block truncate text-sm font-semibold"
                      }
                      style={{ color: meta.color }}
                    >
                      {display.title}
                    </span>
                    {infoBits.length > 0 && (
                      <span className="mt-0.5 block text-left text-xs text-session-mute">
                        {infoBits.join(" · ")}
                      </span>
                    )}
                    {showNames && (
                      <span className="mt-0.5 block text-right">
                        {/* Só a falta grita: vaga acionável em acento, designada em voz neutra. */}
                        <span
                          className={`block truncate text-sm font-semibold ${
                            hasAssignee || !interactive ? "text-session-fg" : "text-accent"
                          }`}
                        >
                          {hasAssignee ? display.line1 : es.sinAsignar}
                        </span>
                        {display.line2 && (
                          <span className="block truncate text-xs text-session-fg opacity-90">
                            {display.line2}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                  {interactive ? (
                    <span
                      aria-hidden
                      className="grid h-7 w-7 shrink-0 place-items-center self-center rounded-lg bg-session-chip text-session-faint"
                    >
                      <FaChevronRight size={12} />
                    </span>
                  ) : null}
                </>
              );
              return (
                <div key={`${part.startTime}-${part.title}-${part.id}`}>
                  {part.showSection && (
                    <div className={`flex items-center gap-3 py-3 ${index === 0 ? "" : "mt-2"}`}>
                      <span
                        className="section-emblem grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        <SectionIcon aria-hidden size={30} />
                      </span>
                      <span
                        className="font-display text-xl font-semibold leading-tight tracking-tight"
                        style={{ color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </div>
                  )}
                  {interactive ? (
                    <button
                      type="button"
                      onClick={() => setEditing(part)}
                      aria-label={`${es.asignar} ${display.title}`}
                      className="flex w-full items-start gap-3 py-3 text-left transition-colors hover:bg-session-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-session-fg"
                    >
                      {rowContent}
                    </button>
                  ) : (
                    <article
                      aria-label={`${display.title} — ${names}`}
                      className="flex w-full items-start gap-3 py-3"
                    >
                      {rowContent}
                    </article>
                  )}
                </div>
              );
            })}
          </div>
          {displayParts.length === 0 && (
            <div className="flex flex-col gap-2 px-0 py-4">
              <p className="text-sm font-medium text-session-fg">{es.programaNoEncontrado}</p>
            </div>
          )}
        </Card>
      )}

      {canManage && dirtyCount > 0 && (
        <div className="fixed inset-x-0 bottom-[76px] z-30 mx-auto w-full max-w-md px-4 sm:max-w-xl">
          <div className="rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-lg">
            <p className="truncate text-sm">
              <span className="font-semibold">
                {dirtyCount} {es.sinGuardar}:
              </span>{" "}
              <span className="text-muted-foreground">{dirtySummary}</span>
            </p>
            {saving && saveProgress && (
              <p className="mt-1 text-xs text-muted-foreground">
                {es.guardando} {saveProgress.done}/{saveProgress.total}…
              </p>
            )}
            <div className="mt-2 flex gap-2">
              <Button disabled={saving} onClick={() => void handleSaveAll()} className="flex-1">
                {saving ? es.guardando : `${es.guardarCambios} (${dirtyCount})`}
              </Button>
              <Button
                variant="outline"
                disabled={saving}
                onClick={handleCancelAll}
                className="flex-1"
              >
                {es.descartar}
              </Button>
            </div>
          </div>
        </div>
      )}
      {justSaved && (
        <p role="status" className="text-sm font-medium text-success">
          {es.programaGuardado} · {formatWeekRange(weekStart)}
        </p>
      )}

      {programId && (
        <details className="group rounded-2xl border border-input bg-background">
          <summary className="flex cursor-pointer list-none items-center justify-between p-3 focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
            <span className="font-display text-sm font-medium text-muted-foreground">
              {es.exportar}
            </span>
            <FaChevronDown
              aria-hidden
              size={14}
              className="shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-open:rotate-180"
            />
          </summary>
          <div className="flex gap-2 px-3 pb-3">
            <button
              type="button"
              onClick={() => setPdfOpen(true)}
              className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-secondary px-3 text-center font-display text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {es.crearPdf}
            </button>
            <a
              href={`/api/reunioes/ical?kind=${kind}&week=${weekStart}`}
              className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-secondary px-3 text-center font-display text-sm font-medium text-muted-foreground"
            >
              {es.descargarICal}
            </a>
          </div>
        </details>
      )}
      {pdfOpen && (
        <PdfExportModal
          kind={kind}
          midweekDay={midweekDay}
          weekendDay={weekendDay}
          congregationName={congregationName}
          onClose={() => setPdfOpen(false)}
        />
      )}

      {editing && !editing.id.startsWith("tpl-") && (
        <MeetingAssignModal
          title={editing.title}
          subtitle={`${meetingDayName} · ${editing.startTime}`}
          capability={editing.capability}
          needsHelper={editing.needsHelper}
          isSong={Boolean(editing.songNumber || editing.key.includes("song"))}
          // Só partes com capability permitem escolher pessoa (cântico inicial,
          // palavras de introdução e cântico do meio ficam só com o cântico).
          // O cântico da Atalaia continua só com o cântico. O cântico inicial
          // do fim de semana é opcional e só escolhe o número.
          allowPerson={
            editing.key !== "watchtower-song" &&
            Boolean(editing.capability) &&
            !(kind === "weekend" && editing.key === "opening-song")
          }
          partKey={editing.key}
          classroom={editing.classroom}
          songs={songs}
          outlines={outlines.map((o) => ({
            id: o.id,
            number: o.number,
            theme: o.theme,
            language: o.language,
          }))}
          systemCongregation={congregationName}
          startTime={editing.startTime}
          durationMinutes={editing.durationMinutes}
          currentPersonName={editing.personName ?? ""}
          currentHelperName={editing.helperPersonName ?? editing.helperName ?? ""}
          onClose={() => setEditing(null)}
          onStage={(change) => handleStage(editing.id, change)}
          onOutlineStage={(id) => {
            if (id === null) {
              setPendingOutlineId(null);
              return;
            }
            handlePublicTalkOutline(id);
          }}
        />
      )}
    </div>
  );
}

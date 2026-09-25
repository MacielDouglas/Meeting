"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
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
  type StagedChangeInput,
  saveMeetingProgram,
  saveStagedChanges,
} from "@/features/meetings/application/meeting-actions";
import { getMeetingProgram } from "@/features/meetings/application/meeting-queries";
import { summarizeAssignments } from "@/features/meetings/domain/assignment-stats";
import {
  type BuiltPart,
  buildMidweekParts,
  buildWeekendParts,
  classifySavedPart,
  type WorkbookWeekLike,
} from "@/features/meetings/domain/build-meeting-program";
import {
  findWatchtowerArticleIndex,
  findWorkbookWeekIndex,
} from "@/features/meetings/domain/match-meeting-content";
import { sectionMetaOf } from "@/features/meetings/domain/section-meta";
import {
  blocksMeeting,
  resolveWeekOverrides,
} from "@/features/meetings/domain/special-event-weeks";
import { useReunioesEditMode } from "@/features/meetings/presentation/ReunioesEditMode-client";
import { SpecialEventBanner } from "@/features/meetings/presentation/SpecialEventBanner";
import type { SpecialEventItem } from "@/features/settings/application/queries";
import { CardSkeleton } from "@/shared/components/skeletons";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { es } from "@/shared/i18n/es";
import { MONTH_SHORT_ES, WEEKDAY_FULL_ES, WEEKDAY_SHORT_ES } from "@/shared/lib/format-date";
import { isNextRedirectError } from "@/shared/lib/redirect-error";
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
  events: SpecialEventItem[];
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

/** Intervalo da semana: "12 – 18 ene" ou "28 ene – 3 feb". */
function formatWeekRange(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const [, sm, sd] = weekStart.split("-").map(Number);
  const [, em, ed] = end.split("-").map(Number);
  const startDay = String(sd).padStart(2, "0");
  const endDay = String(ed).padStart(2, "0");
  if (sm === em) return `${startDay} – ${endDay} ${MONTH_SHORT_ES[sm - 1]}`;
  return `${startDay} ${MONTH_SHORT_ES[sm - 1]} – ${endDay} ${MONTH_SHORT_ES[em - 1]}`;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Rascunho encenado em sessionStorage (rede de segurança ao trocar de semana). */
function draftStorageKey(kind: string, weekStart: string): string {
  return `reunion-draft:${kind}:${weekStart}`;
}

function readStoredDraft(key: string): {
  pending: Record<string, StagedChange>;
  outlineId: string | null;
} | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      pending?: Record<string, StagedChange>;
      outlineId?: string | null;
    };
    if (!parsed || typeof parsed.pending !== "object" || parsed.pending === null) return null;
    return {
      pending: parsed.pending,
      outlineId: typeof parsed.outlineId === "string" ? parsed.outlineId : null,
    };
  } catch {
    return null;
  }
}

const SECTION_ICONS: Record<string, IconType> = {
  "TESOROS DE LA BIBLIA": IoDiamond,
  "SEAMOS MEJORES MAESTROS": LuWheat,
  "NUESTRA VIDA CRISTIANA": GiSheep,
  "PUBLIC TALK": FaMicrophone,
  "ESTUDIO DE LA ATALAYA": FaBookOpen,
};

/** Partes fixas: só leitura, sem botão de designação. O cântico final
    ("y oración") designa a oração e fica de fora desta lista. */
const ALWAYS_DISPLAY_ONLY_KEYS = new Set([
  "opening-comments",
  "middle-song",
  "concluding-comments",
  "watchtower-song",
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
  events,
}: MeetingProgramSectionProps) {
  // Modo edição (switch no topo para owner/admin): sem ele, mesmo quem pode
  // gerenciar vê só as designações, sem opção de editar.
  const editMode = useReunioesEditMode();
  const canEdit = canManage && editMode;
  const [kind, setKind] = useState<"midweek" | "weekend">(initialKind);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(
    () => (weekOffset === 0 ? initialWeekStart : mondayOf(weekOffset)),
    [weekOffset, initialWeekStart],
  );
  const [outlineId, setOutlineId] = useState<string>("");
  // Alterações preparadas pelo usuário (clique nas partes); só persistem no Salvar.
  const [pending, setPending] = useState<Record<string, StagedChange>>({});
  // Esboço do fim de semana também encena antes de salvar (mesmo modelo mental).
  // A escolha nasce no modal do discurso público; o topo não seleciona mais.
  const [pendingOutlineId, setPendingOutlineId] = useState<string | null>(null);
  const [loadToken, setLoadToken] = useState(0);
  const [appliedLoadKey, setAppliedLoadKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ done: number; total: number } | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [failedLabel, setFailedLabel] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DisplayPart | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [vacantOnly, setVacantOnly] = useState(false);
  const [navRequest, setNavRequest] = useState<
    | { type: "kind"; value: "midweek" | "weekend" }
    | { type: "step"; delta: number }
    | { type: "today" }
    | null
  >(null);

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

  // Evento especial da semana: asamblea/celebración substituem a reunião
  // (bloqueiam programar); visita ajusta o modelo; discurso especial avisa.
  const weekEnd = addDays(weekStart, 6);
  const overrides = useMemo(
    () =>
      resolveWeekOverrides(
        {
          weekStart,
          weekEnd,
          midweekDate: addDays(weekStart, (midweekDay - 1 + 7) % 7),
          weekendDate: addDays(weekStart, (weekendDay - 1 + 7) % 7),
        },
        events,
      ),
    [weekStart, weekEnd, midweekDay, weekendDay, events],
  );
  const override = kind === "midweek" ? overrides.midweek : overrides.weekend;
  const blocked = blocksMeeting(override);
  const visit = override.kind === "circuit-visit" ? override.visit : null;

  // Cabeçalho da lista: dia da semana | nome da reunião.
  // Na visita, o meio de semana vai para terça.
  const meetingDay = kind === "midweek" ? (visit ? 2 : midweekDay) : weekendDay;
  const meetingDayName = WEEKDAY_FULL_ES[meetingDay] ?? "";
  const meetingTitle = kind === "midweek" ? "Reunión de entre semana" : "Reunión del fin de semana";

  const template: BuiltPart[] = useMemo(() => {
    if (kind === "midweek") {
      if (!workbook) return [];
      return buildMidweekParts({ meeting: workbook.meeting }, midweekTime, songMap, visit);
    }
    if (!article) return [];
    return buildWeekendParts(
      weekendTime,
      null,
      outline?.theme ?? "Discurso público",
      outline?.number ?? null,
      article,
      songMap,
      visit,
    );
  }, [kind, workbook, midweekTime, weekendTime, outline, article, songMap, visit]);

  // Programa salvo via TanStack Query: cache entre montagens (staleTime 1h),
  // dedupe e invalidação explícita; loadToken força uma chave nova no Reintentar.
  // O rascunho de sessionStorage viaja junto para restaurar na primeira carga.
  const programQuery = useQuery({
    queryKey: ["meeting-program", kind, weekStart, loadToken],
    queryFn: async () => {
      const [result, draft] = await Promise.all([
        getMeetingProgram(kind, weekStart),
        Promise.resolve(readStoredDraft(draftStorageKey(kind, weekStart))),
      ]);
      return { result, draft };
    },
  });
  const queryClient = useQueryClient();
  const loading = programQuery.isPending;
  const loadError = programQuery.isError;

  // Programa/atribuições derivam dos dados da query (não há estado espelho).
  const programData = programQuery.data;
  const result = programData?.result ?? null;
  const saved = result?.assignments ?? null;
  const programId = result?.program.id ?? null;
  const programException = {
    exceptionType: result?.program.exceptionType ?? "",
    exceptionLabel: result?.program.exceptionLabel ?? "",
  };

  // Ajuste durante o render (padrão React): na troca de semana/tentativa,
  // quando os dados chegam, zera encenação/discurso e restaura o rascunho.
  const loadKey = `${kind}|${weekStart}|${loadToken}`;
  if (programData !== undefined && appliedLoadKey !== loadKey) {
    setAppliedLoadKey(loadKey);
    setError(null);
    // Sincroniza o discurso com o programa salvo (ou volta a "Nenhum" em
    // semana sem programa, sem carregar escolha de outra semana).
    setOutlineId(result?.program.outlineId ?? "");
    setPending(programData.draft ? programData.draft.pending : {});
    setPendingOutlineId(programData.draft ? programData.draft.outlineId : null);
  }

  // Espelha o rascunho em sessionStorage; voltar à semana o restaura.
  useEffect(() => {
    const key = draftStorageKey(kind, weekStart);
    try {
      if (Object.keys(pending).length === 0 && pendingOutlineId === null) {
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(
          key,
          JSON.stringify({ pending, outlineId: pendingOutlineId }),
        );
      }
    } catch {
      /* armazenamento indisponível: segue sem a rede de segurança */
    }
  }, [pending, pendingOutlineId, kind, weekStart]);

  // Leitura estrita: ver nunca escreve. Criação e sincronização do modelo
  // exigem ação explícita do organizador (botões abaixo).
  function buildTemplatePayload() {
    // Na visita, o meio de semana é na terça (segunda + 1).
    const date = kind === "midweek" ? addDays(weekStart, visit ? 1 : 3) : addDays(weekStart, 6);
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
    if (!canEdit || blocked || template.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    setJustSaved(false);
    try {
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
        return;
      }
      setOutlineId(pendingOutlineId ?? outlineId);
      setPendingOutlineId(null);
      await refresh();
    } catch (error) {
      if (isNextRedirectError(error)) throw error;
      setError(error instanceof Error ? error.message : es.errorGuardar);
    } finally {
      setSaving(false);
    }
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
    canEdit &&
    programId !== null &&
    template.length > 0 &&
    saved !== null &&
    templateKeys !== savedKeys;

  /** Sincroniza o programa com o modelo atual, sem perder designações. */
  async function handleSyncModel() {
    if (!canEdit || blocked || !programId || template.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
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
        return;
      }
      await refresh();
    } catch (error) {
      if (isNextRedirectError(error)) throw error;
      setError(error instanceof Error ? error.message : es.errorSincronizar);
    } finally {
      setSaving(false);
    }
  }

  /** Trocar de reunião/semana com pendências abre o diálogo (nada se perde em silêncio). */
  type NavRequest =
    | { type: "kind"; value: "midweek" | "weekend" }
    | { type: "step"; delta: number }
    | { type: "today" };

  function applyNavigate(request: NavRequest) {
    // Trocar de contexto limpa o filtro de vagas (evita lista vazia confusa).
    setVacantOnly(false);
    if (request.type === "kind") setKind(request.value);
    else if (request.type === "step") setWeekOffset((offset) => offset + request.delta);
    else setWeekOffset(0);
  }

  function requestNavigate(request: NavRequest) {
    if (dirtyIds.size === 0 && pendingOutlineId === null) {
      applyNavigate(request);
      return;
    }
    setNavRequest(request);
  }

  function discardAndNavigate(request: NavRequest) {
    try {
      window.sessionStorage.removeItem(draftStorageKey(kind, weekStart));
    } catch {
      /* armazenamento indisponível: segue sem a rede de segurança */
    }
    setPending({});
    setPendingOutlineId(null);
    setError(null);
    setNavRequest(null);
    applyNavigate(request);
  }

  function handleKindChange(next: "midweek" | "weekend") {
    if (next === kind) return;
    requestNavigate({ type: "kind", value: next });
  }

  function handleWeekStep(delta: number) {
    requestNavigate({ type: "step", delta });
  }

  function handleGoToday() {
    requestNavigate({ type: "today" });
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
          ...classifySavedPart(s.partKey, s.title, s.subtitle, kind),
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
    // Mesma parte em salas distintas (A/B/C) não colapsa: chave inclui a sala,
    // com queda para a chave simples em programas antigos sem sala.
    const byKey = new Map(saved.map((a) => [`${a.partKey}|${a.classroom ?? "A"}`, a]));
    const byKeyPlain = new Map(saved.map((a) => [a.partKey, a]));
    return template.map((t, index) => {
      const s = byKey.get(`${t.key}|A`) ?? byKeyPlain.get(t.key);
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
  }, [saved, template, pending, kind]);

  const dirtyIds = new Set(Object.keys(pending));
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
      items.unshift(
        `${es.bosquejo} → ${staged ? `${staged.number} — ${staged.theme}` : es.ninguno}`,
      );
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
    if (blocked) return;
    const entries = Object.entries(pending);
    const items: StagedChangeInput[] = [];
    const labelOf = (assignmentId: string): string =>
      displayParts.find((part) => part.id === assignmentId)?.title ?? assignmentId;
    // O esboço encenado salva junto (mesmo modelo mental das pessoas).
    if (pendingOutlineId !== null) {
      const staged = outlines.find((o) => o.id === pendingOutlineId) ?? null;
      const talk = saved?.find((assignment) => assignment.partKey === "public-talk");
      if (!talk) {
        setError(es.errorGuardar);
        setSaveFailed(true);
        setFailedLabel(null);
        return;
      }
      const title = staged ? `${staged.theme} (${staged.number})` : "Discurso público";
      items.push({ assignmentId: talk.id, label: title, title });
    }
    for (const [assignmentId, change] of entries) {
      items.push({
        assignmentId,
        label: labelOf(assignmentId),
        ...(change.personId !== undefined ? { personId: change.personId } : {}),
        ...(change.helperPersonId !== undefined ? { helperPersonId: change.helperPersonId } : {}),
        ...(change.songNumber !== undefined && change.songNumber !== null
          ? { songNumber: change.songNumber, songTheme: change.songTheme ?? "" }
          : {}),
        ...(change.classroom !== undefined ? { classroom: change.classroom } : {}),
        ...(change.speakerCongregation !== undefined
          ? { speakerCongregation: change.speakerCongregation }
          : {}),
        ...(change.speakerName !== undefined ? { speakerName: change.speakerName } : {}),
      });
    }
    if (items.length === 0) return;
    setSaving(true);
    setSaveProgress({ done: 0, total: items.length });
    setJustSaved(false);
    setError(null);
    setSaveFailed(false);
    setFailedLabel(null);
    try {
      // Lote único: 1 invocação, 1 auth, 1 revalidate (sem N actions em sequência).
      const result = await saveStagedChanges(items);
      if (!result.ok) {
        setError(result.error ?? es.errorGuardar);
        // O lote é idempotente: o Reintentar reenvia tudo.
        setSaveFailed(true);
        setFailedLabel(result.failedLabel ?? null);
        return;
      }
      if (pendingOutlineId !== null) {
        setOutlineId(pendingOutlineId);
        setPendingOutlineId(null);
      }
      setPending({});
      setSaveProgress({ done: items.length, total: items.length });
      await refresh();
      setJustSaved(true);
      setSaveProgress(null);
      setSaveFailed(false);
      setFailedLabel(null);
      window.setTimeout(() => setJustSaved(false), 6000);
    } catch (error) {
      setError(error instanceof Error ? error.message : es.errorGuardar);
      setSaveFailed(true);
      setFailedLabel(null);
    } finally {
      setSaving(false);
    }
  }

  function handleCancelAll() {
    setPending({});
    setPendingOutlineId(null);
    setError(null);
    setSaveFailed(false);
    setFailedLabel(null);
  }

  /**
   * Confirmação do modal do discurso: mesma escolha vale para título salvo e
   * modelo da semana; sem mudança real, nada encena.
   */
  function handlePublicTalkOutline(id: string) {
    setPendingOutlineId(id === outlineId ? null : id);
  }

  async function refresh() {
    // Invalida a chave da semana: refetch devolve dado fresco e o efeito de
    // aplicação atualiza programa/atribuições sem mexer na encenação.
    await queryClient.invalidateQueries({ queryKey: ["meeting-program", kind, weekStart] });
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

  /** "N/M asignadas" + filtro de vagas: mesma regra conta progresso e visibilidade. */
  const assignmentStats = useMemo(() => {
    // Só partes designáveis entram no progresso (mesma regra da
    // interatividade, sem o bloqueio de `saving` para o número não piscar).
    // Cânticos ficam de fora: nunca exibem "Sin asignar", então não contam.
    const flags = displayPartsWithSections.map((part) => {
      // Cânticos não contam (nunca exibem "Sin asignar") — exceto o final,
      // que designa a pessoa da oração e grita a vaga como as demais.
      const prayerSong = part.key === "closing-song";
      const songPart = part.key.includes("song") || part.songNumber != null;
      const countable =
        canEdit &&
        programId !== null &&
        !ALWAYS_DISPLAY_ONLY_KEYS.has(part.key) &&
        (!songPart || prayerSong);
      const display = partDisplay.get(part.id);
      return {
        countable,
        assigned: !!display && (display.line1 !== "—" || display.line2 !== ""),
      };
    });
    const { assigned, total } = summarizeAssignments(flags);
    const rowVisible = flags.map((flag) => !vacantOnly || !flag.countable || !flag.assigned);
    // Cabeçalho aparece só com fileira visível abaixo dele até o próximo.
    const headerVisible = new Map<number, boolean>();
    let current: number | null = null;
    displayPartsWithSections.forEach((part, index) => {
      if (part.showSection) {
        current = index;
        headerVisible.set(index, false);
      }
      if (current !== null && rowVisible[index]) headerVisible.set(current, true);
    });
    return { assigned, total, rowVisible, headerVisible };
  }, [displayPartsWithSections, partDisplay, canEdit, programId, vacantOnly]);
  const assignmentProgress = {
    assigned: assignmentStats.assigned,
    total: assignmentStats.total,
  };

  return (
    <div className="section-stack">
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
            className={`h-8 flex-1 rounded-lg font-display text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
              kind === option.value
                ? "bg-background font-semibold text-foreground shadow-sm"
                : "font-medium text-muted-foreground hover:text-foreground"
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
          className="grid h-11 w-11 shrink-0 place-items-center self-center rounded-xl border border-input bg-background transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label={es.semanaAnterior}
        >
          <FaChevronLeft size={16} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 py-1 text-center">
          <p className="truncate font-display text-2xl font-semibold leading-none tracking-tight">
            {formatWeekRange(weekStart)}
          </p>
          <p className="truncate text-sm font-medium text-muted-foreground">
            {kind === "midweek" ? es.entreSemana : es.finSemana} ·{" "}
            {WEEKDAY_SHORT_ES[kind === "midweek" ? midweekDay : weekendDay]}{" "}
            {kind === "midweek" ? midweekTime : weekendTime}
          </p>
          {weekOffset !== 0 ? (
            <button
              type="button"
              onClick={handleGoToday}
              className="mt-1 inline-flex h-9 min-w-12 items-center justify-center rounded-xl bg-secondary px-4 font-display text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/70 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {es.hoy}
            </button>
          ) : (
            <span aria-hidden className="mt-1 h-9" />
          )}
        </div>
        <button
          type="button"
          onClick={() => handleWeekStep(1)}
          className="grid h-11 w-11 shrink-0 place-items-center self-center rounded-xl border border-input bg-background transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label={es.semanaSiguiente}
        >
          <FaChevronRight size={16} />
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-3">
          <p className="text-sm text-danger-on-soft">{error}</p>
          {saveFailed && (
            <>
              {failedLabel ? (
                <p className="mt-1 text-xs text-danger-on-soft">
                  {es.falloEn}: {failedLabel}
                </p>
              ) : null}
              <div className="mt-2">
                <Button size="sm" disabled={saving} onClick={() => void handleSaveAll()}>
                  {saving ? es.guardando : es.reintentar}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      {modelSyncAvailable && !loading && (
        <div role="status" className="rounded-xl border border-warning/30 bg-warning-soft p-3">
          <p className="text-sm text-warning-on-soft">{es.modeloCambiado}</p>
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
      {!canEdit && (
        <p className="text-xs text-muted-foreground">
          {canManage ? es.activaModoEdicion : es.soloLectura}
        </p>
      )}

      {override.kind !== "none" && !blocked && !loading && !loadError && (
        <SpecialEventBanner
          event={override.event}
          variant={override.kind}
          showTuesdayNote={kind === "midweek" && override.kind === "circuit-visit"}
          compact
        />
      )}

      {canEdit && !blocked && programId !== null && !loading && assignmentStats.total > 0 && (
        <fieldset className="flex rounded-xl bg-secondary p-1">
          <legend className="sr-only">{es.filtrarPartes}</legend>
          {(
            [
              { value: "all", label: es.todas },
              {
                value: "vacant",
                label: `${es.sinAsignar} (${assignmentStats.total - assignmentStats.assigned})`,
              },
            ] as const
          ).map((option) => {
            const active = vacantOnly ? option.value === "vacant" : option.value === "all";
            const disabled =
              option.value === "vacant" && assignmentStats.total - assignmentStats.assigned === 0;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => setVacantOnly(option.value === "vacant")}
                className={`h-8 flex-1 rounded-lg font-display text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${
                  active
                    ? "bg-background font-semibold text-foreground shadow-sm"
                    : "font-medium text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </fieldset>
      )}

      {loading ? (
        <CardSkeleton />
      ) : loadError ? (
        <Card className="flex flex-col gap-3 border-0 bg-session p-4 text-session-fg shadow-none">
          <p role="alert" className="text-sm text-danger">
            {es.errorCargarPrograma}
          </p>
          <div>
            <Button size="sm" variant="outline" onClick={() => setLoadToken((token) => token + 1)}>
              {es.reintentar}
            </Button>
          </div>
        </Card>
      ) : blocked ? (
        <>
          <SpecialEventBanner event={override.event} variant={override.kind} />
          <p className="text-xs text-muted-foreground">{es.eventReplacesMeeting}</p>
        </>
      ) : programId === null ? (
        <Card className="flex flex-col overflow-hidden border-0 bg-session p-0 text-session-fg shadow-none">
          <div className="flex flex-col gap-2 px-0 py-4">
            <p className="text-sm font-medium text-session-fg">{es.programaNoEncontrado}</p>
            {canEdit && template.length > 0 && (
              <div>
                <Button disabled={saving} onClick={() => void handleCreateProgram()}>
                  {saving ? es.guardandoPrograma : es.crearProgramaSemana}
                </Button>
              </div>
            )}
            {template.length === 0 && (
              <>
                <p className="text-sm text-session-mute">{es.importarGuiaHint}</p>
                {canEdit && <JwpubImportButton />}
              </>
            )}
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col overflow-visible border-0 bg-session p-0 text-session-fg shadow-none">
          <div className="sticky top-0 z-10 flex items-baseline justify-between gap-3 border-b border-session-line bg-session/95 px-0 py-3 backdrop-blur">
            <p className="text-sm font-medium text-session-mute">
              {meetingDayName} · {meetingTitle}
            </p>
            <p className="shrink-0 text-sm font-medium tabular-nums text-session-mute">
              {assignmentProgress.assigned}/{assignmentProgress.total} {es.asignadas}
            </p>
          </div>
          <div aria-busy={saving} className="flex flex-col divide-y divide-session-line">
            {displayPartsWithSections.map((part, index) => {
              const meta = sectionMetaOf(part.section);
              const SectionIcon = SECTION_ICONS[part.section] ?? FaBookOpen;
              const display = partDisplay.get(part.id);
              if (!display) return null;
              if (!assignmentStats.rowVisible[index]) return null;
              const isSongPart = part.key.includes("song") || part.songNumber != null;
              // Botão sempre renderizado (foco preservado); salvando só desabilita.
              const interactive =
                canEdit &&
                programId !== null &&
                !ALWAYS_DISPLAY_ONLY_KEYS.has(part.key) &&
                !(kind === "midweek" && part.key === "opening-song");
              const isDirty = dirtyIds.has(part.id);
              const infoBits = [display.subtitle].filter(Boolean);
              const hasAssignee = display.line1 !== "—" || display.line2 !== "";
              // Nomes só aparecem com designado; cânticos nunca mostram "Sin asignar",
              // exceto o final, que designa a oração e grita a vaga como as demais.
              const showNames =
                hasAssignee || ((!isSongPart || part.key === "closing-song") && interactive);
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
                      title={display.title}
                      className={
                        part.key === "public-talk"
                          ? "block truncate text-base font-semibold text-session-fg"
                          : "block truncate text-sm font-semibold text-session-fg"
                      }
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
                <div key={part.id}>
                  {part.showSection && assignmentStats.headerVisible.get(index) !== false && (
                    <div className={`flex items-center gap-3 py-4 ${index === 0 ? "" : "mt-1"}`}>
                      <span
                        className="section-emblem grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        <SectionIcon aria-hidden size={30} />
                      </span>
                      <span
                        className="section-label font-display text-2xl font-semibold leading-tight tracking-tight"
                        style={{ "--section-color": meta.color } as CSSProperties}
                      >
                        {meta.label}
                      </span>
                    </div>
                  )}
                  {interactive ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setEditing(part)}
                      aria-label={`${es.asignar} ${display.title}`}
                      className="flex w-full items-start gap-3 py-3 text-left transition-colors hover:bg-session-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-session-fg disabled:opacity-70"
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

      {vacantOnly &&
        assignmentStats.total > 0 &&
        assignmentStats.assigned === assignmentStats.total && (
          <Card className="flex flex-col gap-2 border-0 bg-session p-4 text-session-fg shadow-none">
            <p className="text-sm font-medium text-success">{es.todoAsignado}</p>
            <div>
              <Button size="sm" variant="outline" onClick={() => setVacantOnly(false)}>
                {es.verTodas}
              </Button>
            </div>
          </Card>
        )}

      {canEdit && dirtyCount > 0 && (
        <div className="fixed inset-x-0 bottom-[84px] z-30 mx-auto w-full max-w-md px-4 pb-[env(safe-area-inset-bottom)] sm:max-w-[42rem] lg:max-w-[56rem]">
          <div className="rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-lg">
            <p className="text-sm">
              <span className="font-semibold">
                {dirtyCount} {es.sinGuardar}:
              </span>{" "}
              <span title={dirtySummary} className="line-clamp-2 text-muted-foreground">
                {dirtySummary}
              </span>
            </p>
            {saving && saveProgress && (
              <p role="status" className="mt-1 text-xs text-muted-foreground">
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

      {programId && canEdit && (
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
              className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-secondary px-3 text-center font-display text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
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

      {navRequest && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setNavRequest(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{es.descartarTitulo}</DialogTitle>
              <DialogDescription>
                {dirtyCount} {es.sinGuardar}: {dirtySummary}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose>{es.seguirEditando}</DialogClose>
              <Button
                className="border-transparent bg-danger text-danger-ink"
                onClick={() => discardAndNavigate(navRequest)}
              >
                {es.descartar} ({dirtyCount})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
          // O cântico da Atalaia continua só com o cântico; o final designa
          // a oração (filtro prayer). O cântico inicial do fim de semana é
          // opcional e só escolhe o número.
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

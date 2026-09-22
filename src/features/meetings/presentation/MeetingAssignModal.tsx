"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import {
  listMeetingPersons,
  type MeetingPerson,
} from "@/features/meetings/application/meeting-person-queries";
import { updateOutsideSpeaker } from "@/features/meetings/application/outside-speaker-actions";
import {
  type OutsideSpeakerItem,
  searchOutsideSpeakers,
} from "@/features/meetings/application/outside-speaker-queries";
import {
  capabilityField,
  helperCapabilityField,
  helperRuleFor,
  isEligibleHelper,
} from "@/features/meetings/domain/capabilities";
import {
  newTalkDraft,
  SpeakerTalkFields,
  type TalkDraft,
} from "@/features/meetings/presentation/SpeakerTalkFields-client";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { es } from "@/shared/i18n/es";
import { formatDateBR } from "@/shared/lib/format-date";

interface SongOption {
  number: number;
  theme: string;
}

/** Alteração preparada (staged) para uma designação; só salva no Salvar da tabela. */
export interface StagedChange {
  personId?: string | null;
  personName?: string;
  helperPersonId?: string | null;
  helperPersonName?: string;
  songNumber?: number | null;
  songTheme?: string;
  classroom?: "A" | "B" | "C";
  speakerCongregation?: string;
  /** Orador de fora: nome livre (salva via detalhes, sem vínculo de pessoa). */
  speakerName?: string;
}

interface MeetingAssignModalProps {
  title: string;
  subtitle?: string;
  capability?: string;
  needsHelper?: boolean;
  isSong?: boolean;
  /** false esconde a lista de pessoas (ex.: cântico da Atalaia: só o cântico). */
  allowPerson?: boolean;
  partKey?: string;
  classroom?: string;
  speakerCongregation?: string;
  songs: SongOption[];
  outlines: { number: number; theme: string }[];
  currentPersonName: string;
  currentHelperName: string;
  onClose: () => void;
  onStage: (change: StagedChange) => void;
}

type Step = "titular" | "helper";

function fullName(person: MeetingPerson): string {
  return `${person.firstName} ${person.lastName}`;
}

/** Rótulos do fluxo conforme a parte (ministério usa titular/ajudante). */
function roleLabels(capability?: string) {
  if (capability === "congregationStudy" || capability === "watchtowerStudy") {
    return { main: es.conductor, helper: es.lector, withoutHelper: es.continuarSinLector };
  }
  return { main: es.titular, helper: es.ayudante, withoutHelper: es.continuarSinAyudante };
}

function formatLastAssignment(iso: string | null): string {
  if (!iso) return es.sinHistorial;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return es.sinHistorial;
  return `última: ${formatDateBR(iso.slice(0, 10))}`;
}

interface SpeakerTalksViewProps {
  speaker: OutsideSpeakerItem;
  outlines: { number: number; theme: string }[];
  onBack: () => void;
  onSaved: (speaker: OutsideSpeakerItem) => void;
}

/** Edição dos discursos de um orador dentro do fluxo de designação. */
function SpeakerTalksView({ speaker, outlines, onBack, onSaved }: SpeakerTalksViewProps) {
  const [talks, setTalks] = useState<TalkDraft[]>(() =>
    speaker.talks.length > 0
      ? speaker.talks.map((talk) => ({
          key: `${talk.id}`,
          number: String(talk.talkNumber),
          theme: talk.talkTheme,
        }))
      : [newTalkDraft()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveAndAssign() {
    setSaving(true);
    setError(null);
    try {
      const parsed = talks.flatMap((talk) => {
        const talkNumber = Number(talk.number);
        if (!Number.isInteger(talkNumber) || talkNumber <= 0) return [];
        return [{ talkNumber, talkTheme: talk.theme.trim() }];
      });
      const result = await updateOutsideSpeaker(speaker.id, {
        name: speaker.name,
        congregation: speaker.congregation,
        phone: speaker.phone,
        notes: speaker.notes,
        talks: parsed,
      });
      if (!result.ok) {
        setError(result.error ?? es.errorGuardar);
        return;
      }
      onSaved(speaker);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="leading-snug">{speaker.name}</AlertDialogTitle>
        <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">
          {speaker.congregation || es.sinCongregacion} · {es.anadirDiscurso}
        </p>
      </AlertDialogHeader>
      <SpeakerTalkFields talks={talks} outlines={outlines} onChange={setTalks} />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <AlertDialogFooter>
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 flex-1 items-center justify-center gap-1 rounded-full bg-secondary px-3 font-display text-sm font-medium uppercase tracking-wider text-secondary-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]"
        >
          <FaChevronLeft aria-hidden size={12} />
          {es.volver}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSaveAndAssign()}
          className="h-11 flex-1 rounded-full bg-accent px-4 font-display text-sm font-medium uppercase tracking-wider text-accent-ink transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {saving ? es.guardando : es.guardarYAsignar}
        </button>
      </AlertDialogFooter>
    </>
  );
}

export function MeetingAssignModal({
  title,
  subtitle,
  capability,
  needsHelper,
  isSong,
  allowPerson = true,
  partKey,
  classroom,
  speakerCongregation,
  songs,
  outlines,
  currentPersonName,
  currentHelperName,
  onClose,
  onStage,
}: MeetingAssignModalProps) {
  const [step, setStep] = useState<Step>("titular");
  const [selectedTitular, setSelectedTitular] = useState<MeetingPerson | null>(null);
  const [titularSearchInput, setTitularSearchInput] = useState("");
  const [helperSearchInput, setHelperSearchInput] = useState("");
  const [orderBy, setOrderBy] = useState<"name" | "rotation">("name");
  const [songNumber, setSongNumber] = useState("");
  const [songError, setSongError] = useState<string | null>(null);
  // Alteração local do modal: nada fecha nem salva sozinho — o rodapé
  // "Asignar" confirma tudo de uma vez (pessoa + cântico + sala + congregação).
  const [staged, setStaged] = useState<StagedChange | null>(null);
  const [room, setRoom] = useState<"A" | "B" | "C">(
    classroom === "B" || classroom === "C" ? classroom : "A",
  );
  const [congregation, setCongregation] = useState(speakerCongregation ?? "");
  // Sala só nas partes com ajudante do ministério (encenações); discursos
  // (sem ajudante) e estudo/leitura não usam sala.
  const isMinistry =
    Boolean(needsHelper) &&
    (capability?.startsWith("ministry") === true || partKey?.startsWith("ministry-") === true);
  const isPublicTalk = capability === "publicTalk";
  // Regra do ajudante conforme a parte: mesmo sexo, ou mesmo sexo/família.
  const helperRule = helperRuleFor(capability);
  const labels = roleLabels(capability);
  const withHelperFlow = allowPerson && Boolean(needsHelper);

  // Busca com debounce sem setState em efeito: o valor diferido alimenta a query.
  const titularSearch = useDeferredValue(titularSearchInput.trim());
  const helperSearch = useDeferredValue(helperSearchInput.trim());
  const [speakerSearchInput, setSpeakerSearchInput] = useState("");
  const speakerSearch = useDeferredValue(speakerSearchInput.trim());
  const [talksSpeaker, setTalksSpeaker] = useState<OutsideSpeakerItem | null>(null);
  const queryClient = useQueryClient();
  const titularField = capabilityField(capability);
  const helperField = helperCapabilityField(capability);

  const titularQuery = useQuery({
    queryKey: ["meeting-persons", titularField, titularSearch, orderBy],
    queryFn: () =>
      listMeetingPersons(titularField, {
        search: titularSearch || undefined,
        limit: 60,
        orderBy,
      }),
    enabled: allowPerson,
    placeholderData: keepPreviousData,
  });

  // Oradores de fora no discurso público: busca por número, nome ou congregação.
  const speakerQuery = useQuery({
    queryKey: ["outside-speakers-search", speakerSearch],
    queryFn: () => searchOutsideSpeakers(speakerSearch),
    enabled: isPublicTalk && speakerSearch.length >= 2,
    placeholderData: keepPreviousData,
  });

  function handlePickSpeaker(speaker: OutsideSpeakerItem) {
    setTalksSpeaker(speaker);
  }

  function handleTalksSaved(speaker: OutsideSpeakerItem) {
    setTalksSpeaker(null);
    setCongregation(speaker.congregation);
    setStaged((previous) => ({
      ...previous,
      personName: speaker.name,
      speakerName: speaker.name,
      speakerCongregation: speaker.congregation,
    }));
    void queryClient.invalidateQueries({ queryKey: ["outside-speakers-search"] });
  }

  // Ajudantes só carregam na etapa 2, já com o titular escolhido.
  const helperQuery = useQuery({
    queryKey: ["meeting-persons", helperField, helperSearch, orderBy, "helpers"],
    queryFn: () =>
      listMeetingPersons(helperField, {
        search: helperSearch || undefined,
        // Limite maior para cobrir o filtro por titular (sexo/família);
        // a congregação é pequena.
        limit: 200,
        orderBy,
      }),
    enabled: withHelperFlow && step === "helper",
    placeholderData: keepPreviousData,
  });

  // Ajudantes elegíveis para o titular (mesmo sexo e/ou família), sem o titular.
  const eligibleHelpers = useMemo(() => {
    if (!selectedTitular || step !== "helper") return [];
    return (helperQuery.data ?? []).filter((h) => isEligibleHelper(selectedTitular, h, helperRule));
  }, [helperQuery.data, selectedTitular, step, helperRule]);

  function handlePickTitular(person: MeetingPerson) {
    if (withHelperFlow) {
      setSelectedTitular(person);
      setStep("helper");
      return;
    }
    setStaged((previous) => ({
      ...previous,
      personId: person.id,
      personName: fullName(person),
    }));
  }

  function handlePickHelper(helper: MeetingPerson | null) {
    if (!selectedTitular) return;
    setStaged((previous) => ({
      ...previous,
      personId: selectedTitular.id,
      personName: fullName(selectedTitular),
      helperPersonId: helper ? helper.id : null,
      helperPersonName: helper ? fullName(helper) : "",
    }));
  }

  function handleBackToTitular() {
    setStep("titular");
  }

  function handleSongStage() {
    const n = Number(songNumber);
    if (!Number.isInteger(n) || n <= 0) {
      setSongError(es.numeroCancion);
      return;
    }
    setSongError(null);
    const theme = songs.find((s) => s.number === n)?.theme ?? "";
    setStaged((previous) => ({ ...previous, songNumber: n, songTheme: theme }));
  }

  function handleClassroomStage(value: "A" | "B" | "C") {
    setRoom(value);
  }

  function handleCongregationStage() {
    setStaged((previous) => ({
      ...previous,
      speakerCongregation: congregation.trim().slice(0, 160),
    }));
  }

  function handleAsignar() {
    if (!staged) return;
    onStage({
      ...staged,
      ...(isMinistry ? { classroom: room } : {}),
      ...(isPublicTalk ? { speakerCongregation: congregation.trim().slice(0, 160) } : {}),
    });
    onClose();
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent className="max-h-[85dvh] overflow-y-auto">
        {talksSpeaker ? (
          <SpeakerTalksView
            speaker={talksSpeaker}
            outlines={outlines}
            onBack={() => setTalksSpeaker(null)}
            onSaved={handleTalksSaved}
          />
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="leading-snug">{title}</AlertDialogTitle>
              {subtitle && (
                <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </AlertDialogHeader>
            {(currentPersonName || currentHelperName) && (
              <p className="text-sm text-muted-foreground">
                {es.actual}:{" "}
                <span className="font-medium text-foreground">{currentPersonName}</span>
                {currentHelperName ? ` · ${currentHelperName}` : ""}
              </p>
            )}
            {isSong && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    value={songNumber}
                    onChange={(e) => setSongNumber(e.target.value)}
                    inputMode="numeric"
                    placeholder={es.numCancion}
                    aria-label={es.numCancion}
                    className="h-11 w-32 rounded-lg bg-secondary px-3 text-sm outline-none focus:border-ring"
                  />
                  <button
                    type="button"
                    onClick={handleSongStage}
                    className="h-11 rounded-full bg-secondary px-5 font-display text-sm font-medium uppercase tracking-wider text-secondary-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]"
                  >
                    {es.definir}
                  </button>
                </div>
                {staged?.songNumber ? (
                  <p className="text-sm font-medium text-accent">
                    Canción {staged.songNumber}
                    {staged.songTheme ? ` · ${staged.songTheme}` : ""}
                  </p>
                ) : null}
              </div>
            )}
            {songError && (
              <p role="alert" className="text-sm text-danger">
                {songError}
              </p>
            )}
            {isMinistry && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{es.sala}:</span>
                {(["A", "B", "C"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleClassroomStage(option)}
                    className={`h-11 w-12 rounded-full text-xs font-semibold ${room === option ? "bg-accent text-accent-ink" : "bg-secondary text-muted-foreground"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
            {isPublicTalk && (
              <div className="flex flex-col gap-2">
                <input
                  value={speakerSearchInput}
                  onChange={(e) => setSpeakerSearchInput(e.target.value)}
                  placeholder={es.buscarOrador}
                  aria-label={es.buscarOrador}
                  maxLength={60}
                  className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none focus:border-ring"
                />
                {(speakerQuery.data ?? []).length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {speakerQuery.data?.map((speaker) => (
                      <li key={speaker.id}>
                        <button
                          type="button"
                          onClick={() => handlePickSpeaker(speaker)}
                          aria-pressed={staged?.speakerName === speaker.name}
                          className={`flex min-h-12 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 ${
                            staged?.speakerName === speaker.name
                              ? "bg-accent/10 ring-1 ring-accent"
                              : ""
                          }`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{speaker.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {speaker.congregation || es.sinCongregacion}
                              {speaker.talks.length > 0
                                ? ` · ${speaker.talks.map((talk) => `N.º ${talk.talkNumber}`).join(", ")}`
                                : ""}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <input
                    value={congregation}
                    onChange={(e) => setCongregation(e.target.value)}
                    placeholder={es.congregacionOrador}
                    maxLength={160}
                    className="h-11 flex-1 rounded-lg bg-secondary px-3 text-sm outline-none focus:border-ring"
                  />
                  <button
                    type="button"
                    onClick={handleCongregationStage}
                    className="h-11 rounded-full bg-secondary px-5 font-display text-sm font-medium uppercase tracking-wider text-secondary-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]"
                  >
                    {es.definir}
                  </button>
                </div>
              </div>
            )}
            {!isSong && !allowPerson && (
              <p className="text-sm text-muted-foreground">{es.estaParteSinAsignacion}</p>
            )}

            {withHelperFlow && (
              <ol className="flex gap-2" aria-label="Etapas de la designación">
                <li
                  className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-medium ${step === "titular" ? "bg-accent text-accent-ink" : "bg-secondary text-muted-foreground"}`}
                  aria-current={step === "titular" ? "step" : undefined}
                >
                  <span aria-hidden>1</span> {labels.main}
                </li>
                <li
                  className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-medium ${step === "helper" ? "bg-accent text-accent-ink" : "bg-secondary text-muted-foreground"}`}
                  aria-current={step === "helper" ? "step" : undefined}
                >
                  <span aria-hidden>2</span> {labels.helper}
                </li>
              </ol>
            )}

            {allowPerson && step === "titular" && (
              <div className="flex flex-col gap-2">
                <input
                  value={titularSearchInput}
                  onChange={(e) => setTitularSearchInput(e.target.value)}
                  placeholder={`Buscar ${labels.main.toLowerCase()}…`}
                  aria-label={`Buscar ${labels.main.toLowerCase()}`}
                  maxLength={60}
                  className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderBy("name")}
                    className={`h-9 flex-1 rounded-full font-display text-xs font-medium uppercase tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${orderBy === "name" ? "bg-accent text-accent-ink" : "bg-secondary text-muted-foreground"}`}
                  >
                    {es.ordenAlfabetico}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderBy("rotation")}
                    className={`h-9 flex-1 rounded-full font-display text-xs font-medium uppercase tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${orderBy === "rotation" ? "bg-accent text-accent-ink" : "bg-secondary text-muted-foreground"}`}
                  >
                    {es.rotacion}
                  </button>
                </div>
                {titularQuery.isPending ? (
                  <p className="text-sm text-muted-foreground">{es.cargandoPersonas}</p>
                ) : titularQuery.isError ? (
                  <p role="alert" className="text-sm text-danger">
                    {es.errorCargarPersonas}
                  </p>
                ) : (
                  <>
                    {titularQuery.isFetching && (
                      <p className="text-xs text-muted-foreground">{es.actualizando}</p>
                    )}
                    <ul className="flex flex-col gap-1">
                      {(titularQuery.data ?? []).map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => handlePickTitular(p)}
                            aria-pressed={staged?.personId === p.id}
                            className={`flex min-h-12 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 ${
                              staged?.personId === p.id ||
                              (withHelperFlow && selectedTitular?.id === p.id)
                                ? "bg-accent/10 ring-1 ring-accent"
                                : ""
                            }`}
                          >
                            <span className="flex-1">
                              {p.firstName} {p.lastName}
                              <span className="block text-xs text-muted-foreground">
                                {formatLastAssignment(p.lastAssignmentAt)}
                              </span>
                            </span>
                            <FaChevronRight
                              aria-hidden
                              size={12}
                              className="shrink-0 text-muted-foreground"
                            />
                          </button>
                        </li>
                      ))}
                      {(titularQuery.data ?? []).length === 0 && (
                        <li className="text-sm text-muted-foreground">{es.ningunaPersona}</li>
                      )}
                    </ul>
                  </>
                )}
              </div>
            )}

            {withHelperFlow && step === "helper" && selectedTitular && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block text-xs text-muted-foreground">{labels.main}</span>
                    <span className="block truncate font-medium">{fullName(selectedTitular)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleBackToTitular}
                    className="h-9 shrink-0 rounded-full bg-background px-3 font-display text-xs font-medium uppercase tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]"
                  >
                    {es.cambiar}
                  </button>
                </div>
                {helperRule && (
                  <p className="text-xs text-muted-foreground">
                    {helperRule === "sameSex"
                      ? `${labels.helper}: alguien del mismo sexo que ${selectedTitular.firstName}.`
                      : `${labels.helper}: alguien del mismo sexo o de la misma familia que ${selectedTitular.firstName}.`}
                  </p>
                )}
                <input
                  value={helperSearchInput}
                  onChange={(e) => setHelperSearchInput(e.target.value)}
                  placeholder={`Buscar ${labels.helper.toLowerCase()}…`}
                  aria-label={`Buscar ${labels.helper.toLowerCase()}`}
                  maxLength={60}
                  className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none"
                />
                {helperQuery.isPending ? (
                  <p className="text-sm text-muted-foreground">{es.cargandoPersonas}</p>
                ) : helperQuery.isError ? (
                  <p role="alert" className="text-sm text-danger">
                    {es.errorCargarPersonas}
                  </p>
                ) : (
                  <>
                    {helperQuery.isFetching && (
                      <p className="text-xs text-muted-foreground">{es.actualizando}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => handlePickHelper(null)}
                      className="flex min-h-12 w-full items-center rounded-lg border border-dashed px-3 py-2.5 text-left text-sm font-medium hover:bg-secondary"
                    >
                      {labels.withoutHelper}
                    </button>
                    <ul className="flex flex-col gap-1">
                      {eligibleHelpers.map((h) => (
                        <li key={h.id}>
                          <button
                            type="button"
                            onClick={() => handlePickHelper(h)}
                            aria-pressed={staged?.helperPersonId === h.id}
                            className={`flex min-h-12 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 ${
                              staged?.helperPersonId === h.id
                                ? "bg-accent/10 ring-1 ring-accent"
                                : ""
                            }`}
                          >
                            <span className="flex-1">
                              {h.firstName} {h.lastName}
                              <span className="block text-xs text-muted-foreground">
                                {formatLastAssignment(h.lastAssignmentAt)}
                              </span>
                            </span>
                            <span className="shrink-0 font-display text-xs font-medium uppercase tracking-wider text-accent">
                              {es.elegir}
                            </span>
                          </button>
                        </li>
                      ))}
                      {eligibleHelpers.length === 0 && (
                        <li className="text-sm text-muted-foreground">
                          Ningún {labels.helper.toLowerCase()} elegible para{" "}
                          {selectedTitular.firstName}.
                        </li>
                      )}
                    </ul>
                  </>
                )}
              </div>
            )}

            <AlertDialogFooter>
              {withHelperFlow && step === "helper" && (
                <button
                  type="button"
                  onClick={handleBackToTitular}
                  className="flex h-11 flex-1 items-center justify-center gap-1 rounded-full bg-secondary px-3 font-display text-sm font-medium uppercase tracking-wider text-secondary-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]"
                >
                  <FaChevronLeft aria-hidden size={12} />
                  {es.volver}
                </button>
              )}
              <AlertDialogCancel className="mt-0 flex-1">{es.cancel}</AlertDialogCancel>
              <button
                type="button"
                disabled={!staged}
                onClick={handleAsignar}
                className="h-11 flex-1 rounded-full bg-accent px-4 font-display text-sm font-medium uppercase tracking-wider text-accent-ink transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                {es.asignar}
              </button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

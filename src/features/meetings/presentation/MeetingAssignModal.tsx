"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";
import { FaChevronRight } from "react-icons/fa";
import {
  listMeetingPersons,
  type MeetingPerson,
} from "@/features/meetings/application/meeting-person-queries";
import { listOutsideSpeakers } from "@/features/meetings/application/outside-speaker-queries";
import {
  capabilityField,
  helperCapabilityField,
  helperRuleFor,
  isEligibleHelper,
} from "@/features/meetings/domain/capabilities";
import {
  PublicTalkPicker,
  type PublicTalkSelection,
} from "@/features/meetings/presentation/PublicTalkPicker-client";
import { SegmentedControl } from "@/shared/components/SegmentedControl-client";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
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
  /** Orador (ficha salva): nome livre de vínculo de pessoa, congregação travada na ficha. */
  speakerName?: string;
  /** Nome temporário do ajudante (fora da organização): só fica na parte. */
  helperName?: string;
}

interface OutlineOption {
  id: string;
  number: number;
  theme: string;
  language: string;
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
  songs: SongOption[];
  outlines: OutlineOption[];
  systemCongregation: string;
  startTime: string;
  durationMinutes: number | null;
  currentPersonName: string;
  currentHelperName: string;
  onClose: () => void;
  onStage: (change: StagedChange) => void;
  /** Discurso público: encena o esboço junto (mesmo Salvar da seção). */
  onOutlineStage: (outlineId: string | null) => void;
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

/** Normaliza nome temporário: colapsa espaços, apara e limita a 160. */
function normalizeTempName(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 160);
}

function formatLastAssignment(iso: string | null): string {
  if (!iso) return es.sinHistorial;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return es.sinHistorial;
  return `${es.ultimaAsignacion}: ${formatDateBR(iso.slice(0, 10))}`;
}

/** Preenche modelo traducible ("Buscar {rol}…") sem concatenar fragmentos. */
function fillTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, value),
    template,
  );
}

/** Caixa de nome temporário no fim da lista (fora da organização, só na parte). */
function TempNameBox({
  input,
  onInput,
  onUse,
  inputLabel,
}: {
  input: string;
  onInput: (value: string) => void;
  onUse: () => void;
  inputLabel: string;
}) {
  const valid = input.trim().length >= 2;
  return (
    <div className="rounded-xl border border-dashed border-input p-3">
      <p className="text-sm font-semibold">{es.nombreTemporal}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{es.nombreTemporalHint}</p>
      <div className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(event) => onInput(event.target.value)}
          placeholder={inputLabel}
          aria-label={es.nombreTemporal}
          maxLength={160}
          autoComplete="off"
          className="h-12 min-w-0 flex-1 rounded-lg bg-secondary px-3 text-base outline-none focus:border focus:border-ring"
        />
        <button
          type="button"
          disabled={!valid}
          onClick={onUse}
          className="h-12 shrink-0 rounded-xl bg-secondary px-4 font-display text-sm font-semibold text-secondary-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
        >
          {es.usarNombre}
        </button>
      </div>
    </div>
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
  songs,
  outlines,
  systemCongregation,
  startTime,
  durationMinutes,
  currentPersonName,
  currentHelperName,
  onClose,
  onStage,
  onOutlineStage,
}: MeetingAssignModalProps) {
  const [step, setStep] = useState<Step>("titular");
  const [selectedTitular, setSelectedTitular] = useState<MeetingPerson | null>(null);
  const [titularSearchInput, setTitularSearchInput] = useState("");
  const [helperSearchInput, setHelperSearchInput] = useState("");
  const [orderBy, setOrderBy] = useState<"name" | "rotation">("name");
  const [songNumber, setSongNumber] = useState("");
  const [songError, setSongError] = useState<string | null>(null);
  // Nome temporário (fora da lista e da organização): só fica na parte.
  const [titularTempInput, setTitularTempInput] = useState("");
  const [helperTempInput, setHelperTempInput] = useState("");
  const [tempTitularName, setTempTitularName] = useState<string | null>(null);
  // Alteração local do modal: nada fecha nem salva sozinho — o rodapé
  // "Asignar" confirma tudo de uma vez (pessoa + cântico + sala + congregação).
  const [staged, setStaged] = useState<StagedChange | null>(null);
  const [room, setRoom] = useState<"A" | "B" | "C">(
    classroom === "B" || classroom === "C" ? classroom : "A",
  );
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

  // Discurso público: lista completa de oradores (fora + locais) para o
  // filtro inteligente do picker; congregação sempre a salva na ficha.
  const speakersQuery = useQuery({
    queryKey: ["outside-speakers"],
    queryFn: () => listOutsideSpeakers(),
    enabled: isPublicTalk,
    placeholderData: keepPreviousData,
  });

  /** Confirmação do picker: encena orador + esboço de uma vez no Salvar da seção. */
  function handlePublicTalkConfirm(selection: PublicTalkSelection) {
    onStage({
      personName: selection.speakerName,
      speakerName: selection.speakerName,
      speakerCongregation: selection.speakerCongregation,
    });
    onOutlineStage(selection.outlineId);
    onClose();
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
  // Com titular temporário não há sexo/família para filtrar: lista todos.
  const eligibleHelpers = useMemo(() => {
    if (step !== "helper") return [];
    if (!selectedTitular) return helperQuery.data ?? [];
    return (helperQuery.data ?? []).filter((h) => isEligibleHelper(selectedTitular, h, helperRule));
  }, [helperQuery.data, selectedTitular, step, helperRule]);

  function handlePickTitular(person: MeetingPerson) {
    // Escolha da lista sempre sobrescreve eventual nome temporário.
    setTempTitularName(null);
    if (withHelperFlow) {
      setSelectedTitular(person);
      setStep("helper");
      return;
    }
    setStaged((previous) => ({
      ...previous,
      personId: person.id,
      personName: fullName(person),
      speakerName: undefined,
      helperName: undefined,
    }));
  }

  /** Nome temporário como titular: avança ao ajudante ou encena direto. */
  function handleUseTempTitular() {
    const name = normalizeTempName(titularTempInput);
    if (name.length < 2) return;
    if (withHelperFlow) {
      setSelectedTitular(null);
      setTempTitularName(name);
      setStep("helper");
      return;
    }
    setStaged((previous) => ({
      ...previous,
      personId: null,
      personName: name,
      speakerName: name,
      helperPersonId: null,
      helperPersonName: "",
      helperName: undefined,
    }));
  }

  function handlePickHelper(helper: MeetingPerson | null) {
    const base =
      selectedTitular != null
        ? { personId: selectedTitular.id, personName: fullName(selectedTitular) }
        : tempTitularName != null
          ? { personId: null, personName: tempTitularName, speakerName: tempTitularName }
          : null;
    if (!base) return;
    setStaged((previous) => ({
      ...previous,
      ...base,
      helperPersonId: helper ? helper.id : null,
      helperPersonName: helper ? fullName(helper) : "",
      helperName: undefined,
    }));
  }

  /** Nome temporário como ajudante: mantém o titular já escolhido. */
  function handleUseTempHelper() {
    const name = normalizeTempName(helperTempInput);
    if (name.length < 2) return;
    const base =
      selectedTitular != null
        ? { personId: selectedTitular.id, personName: fullName(selectedTitular) }
        : tempTitularName != null
          ? { personId: null, personName: tempTitularName, speakerName: tempTitularName }
          : null;
    if (!base) return;
    setStaged((previous) => ({
      ...previous,
      ...base,
      helperPersonId: null,
      helperPersonName: name,
      helperName: name,
    }));
  }

  function handleBackToTitular() {
    setTempTitularName(null);
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

  function handleAsignar() {
    if (!staged) return;
    onStage({
      ...staged,
      ...(isMinistry ? { classroom: room } : {}),
    });
    onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="leading-snug">{title}</DialogTitle>
          {subtitle && (
            <p className="font-display text-sm font-medium text-muted-foreground">{subtitle}</p>
          )}
        </DialogHeader>
        {(currentPersonName || currentHelperName) && (
          <p className="text-sm text-muted-foreground">
            {es.actual}: <span className="font-medium text-foreground">{currentPersonName}</span>
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
                maxLength={4}
                className="h-11 w-32 rounded-lg bg-secondary px-3 text-base outline-none focus:border focus:border-ring"
              />
              <button
                type="button"
                onClick={handleSongStage}
                className="h-11 rounded-xl bg-secondary px-5 font-display text-sm font-medium text-secondary-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {es.definirCancion}
              </button>
            </div>
            {staged?.songNumber ? (
              <p className="text-sm font-medium text-foreground">
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
            <span id="sala-label" className="shrink-0 text-xs text-muted-foreground">
              {es.sala}:
            </span>
            <div className="min-w-0 flex-1">
              <SegmentedControl
                options={[
                  { value: "A", label: "A" },
                  { value: "B", label: "B" },
                  { value: "C", label: "C" },
                ]}
                value={room}
                onChange={(value) => handleClassroomStage(value as "A" | "B" | "C")}
                ariaLabel={es.salaDemostracion}
              />
            </div>
          </div>
        )}
        {isPublicTalk &&
          (speakersQuery.isPending ? (
            <p className="text-sm text-muted-foreground">{es.cargandoOradores}</p>
          ) : speakersQuery.isError ? (
            <p role="alert" className="text-sm text-danger">
              {es.errorCargarPersonas}
            </p>
          ) : (
            <PublicTalkPicker
              speakers={speakersQuery.data ?? []}
              outlines={outlines}
              systemCongregation={systemCongregation}
              startTime={startTime}
              durationMinutes={durationMinutes}
              onConfirm={handlePublicTalkConfirm}
            />
          ))}
        {!isSong && !allowPerson && (
          <p className="text-sm text-muted-foreground">{es.estaParteSinAsignacion}</p>
        )}

        {withHelperFlow && (
          <ol className="flex gap-2" aria-label={es.etapasDesignacion}>
            <li
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-medium ${step === "titular" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
              aria-current={step === "titular" ? "step" : undefined}
            >
              <span aria-hidden>1</span> {labels.main}
            </li>
            <li
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-medium ${step === "helper" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
              aria-current={step === "helper" ? "step" : undefined}
            >
              <span aria-hidden>2</span> {labels.helper}
            </li>
          </ol>
        )}

        {allowPerson && step === "titular" && !isPublicTalk && (
          <div className="flex flex-col gap-2">
            <div className="sticky -top-6 z-10 -mx-6 bg-background px-6 pt-6 pb-2">
              <div className="flex flex-col gap-2">
                <input
                  value={titularSearchInput}
                  onChange={(e) => setTitularSearchInput(e.target.value)}
                  placeholder={fillTemplate(es.buscarPersona, { rol: labels.main.toLowerCase() })}
                  aria-label={fillTemplate(es.buscarPersona, { rol: labels.main.toLowerCase() })}
                  maxLength={60}
                  className="h-11 rounded-lg bg-secondary px-3 text-base outline-none focus:border focus:border-ring"
                />
                <SegmentedControl
                  small
                  options={[
                    { value: "name", label: es.ordenAlfabetico },
                    { value: "rotation", label: es.rotacion },
                  ]}
                  value={orderBy}
                  onChange={(value) => setOrderBy(value as "name" | "rotation")}
                  ariaLabel={es.ordenarPor}
                />
              </div>
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
                            ? "bg-accent/10 text-foreground ring-1 ring-accent"
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
                {!isPublicTalk && (
                  <TempNameBox
                    input={titularTempInput}
                    onInput={setTitularTempInput}
                    onUse={handleUseTempTitular}
                    inputLabel={es.escribeNombreTemporal}
                  />
                )}
              </>
            )}
          </div>
        )}

        {withHelperFlow && step === "helper" && (selectedTitular || tempTitularName) && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
              <span className="min-w-0 flex-1 text-sm">
                <span className="block text-xs text-muted-foreground">{labels.main}</span>
                <span className="block truncate font-medium">
                  {selectedTitular ? fullName(selectedTitular) : tempTitularName}
                  {tempTitularName && (
                    <span className="text-muted-foreground"> · {es.temporal}</span>
                  )}
                </span>
              </span>
              <button
                type="button"
                onClick={handleBackToTitular}
                className="h-11 shrink-0 rounded-lg bg-background px-4 font-display text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {es.cambiar}
              </button>
            </div>
            {helperRule && (
              <p className="text-xs text-muted-foreground">
                {fillTemplate(
                  helperRule === "sameSex" ? es.ayudanteMismoSexo : es.ayudanteMismoSexoFamilia,
                  {
                    ayudante: labels.helper,
                    nombre: selectedTitular?.firstName ?? tempTitularName?.split(" ")[0] ?? "",
                  },
                )}
              </p>
            )}
            <div className="sticky -top-6 z-10 -mx-6 bg-background px-6 pt-6 pb-2">
              <input
                value={helperSearchInput}
                onChange={(e) => setHelperSearchInput(e.target.value)}
                placeholder={fillTemplate(es.buscarPersona, { rol: labels.helper.toLowerCase() })}
                aria-label={fillTemplate(es.buscarPersona, { rol: labels.helper.toLowerCase() })}
                maxLength={60}
                className="h-11 rounded-lg bg-secondary px-3 text-base outline-none focus:border focus:border-ring"
              />
            </div>
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
                            ? "bg-accent/10 text-foreground ring-1 ring-accent"
                            : ""
                        }`}
                      >
                        <span className="flex-1">
                          {h.firstName} {h.lastName}
                          <span className="block text-xs text-muted-foreground">
                            {formatLastAssignment(h.lastAssignmentAt)}
                          </span>
                        </span>
                        <span className="shrink-0 font-display text-xs font-medium text-accent">
                          {es.elegir}
                        </span>
                      </button>
                    </li>
                  ))}
                  {eligibleHelpers.length === 0 && (
                    <li className="text-sm text-muted-foreground">
                      {fillTemplate(es.sinAyudanteElegible, {
                        ayudante: labels.helper.toLowerCase(),
                        nombre: selectedTitular?.firstName ?? tempTitularName?.split(" ")[0] ?? "",
                      })}
                    </li>
                  )}
                </ul>
                <TempNameBox
                  input={helperTempInput}
                  onInput={setHelperTempInput}
                  onUse={handleUseTempHelper}
                  inputLabel={es.escribeNombreTemporal}
                />
              </>
            )}
          </div>
        )}

        {staged?.personName ? (
          <p className="rounded-xl bg-secondary px-3 py-2.5 text-sm">
            {es.elegido}: <span className="font-semibold">{staged.personName}</span>
            {staged.speakerName ? <span> · {es.temporal}</span> : null}
            {staged.helperPersonName ? (
              <span>
                {" "}
                · {staged.helperPersonName}
                {staged.helperName ? <span> ({es.temporal})</span> : null}
              </span>
            ) : null}
          </p>
        ) : null}

        {!isPublicTalk && !staged && allowPerson && (
          <p className="text-center text-xs text-muted-foreground">{es.eligeParaContinuar}</p>
        )}

        <DialogFooter>
          <DialogClose className="mt-0 min-h-[52px] flex-1 text-base font-semibold">
            {es.cancel}
          </DialogClose>
          {!isPublicTalk && (
            <button
              type="button"
              disabled={!staged}
              onClick={handleAsignar}
              className="min-h-[52px] flex-1 rounded-xl bg-accent px-4 font-display text-base font-semibold text-accent-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {es.asignar}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

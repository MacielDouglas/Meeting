"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";
import {
  listMeetingPersons,
  type MeetingPerson,
} from "@/features/meetings/application/meeting-person-queries";
import {
  capabilityField,
  helperCapabilityField,
  helperRuleFor,
  isEligibleHelper,
} from "@/features/meetings/domain/capabilities";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
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
}

interface MeetingAssignModalProps {
  title: string;
  capability?: string;
  needsHelper?: boolean;
  isSong?: boolean;
  /** false esconde a lista de pessoas (ex.: cântico da Atalaia: só o cântico). */
  allowPerson?: boolean;
  partKey?: string;
  classroom?: string;
  speakerCongregation?: string;
  songs: SongOption[];
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
    return { main: "Condutor", helper: "Leitor", withoutHelper: "Continuar sem leitor" };
  }
  return { main: "Titular", helper: "Ajudante", withoutHelper: "Continuar sem ajudante" };
}

function formatLastAssignment(iso: string | null): string {
  if (!iso) return "sem histórico";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "sem histórico";
  return `última: ${formatDateBR(iso.slice(0, 10))}`;
}

export function MeetingAssignModal({
  title,
  capability,
  needsHelper,
  isSong,
  allowPerson = true,
  partKey,
  classroom,
  speakerCongregation,
  songs,
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
    onStage({ personId: person.id, personName: fullName(person) });
    onClose();
  }

  function handlePickHelper(helper: MeetingPerson | null) {
    if (!selectedTitular) return;
    onStage({
      personId: selectedTitular.id,
      personName: fullName(selectedTitular),
      helperPersonId: helper ? helper.id : null,
      helperPersonName: helper ? fullName(helper) : "",
    });
    onClose();
  }

  function handleBackToTitular() {
    setStep("titular");
  }

  function handleSongStage() {
    const n = Number(songNumber);
    if (!Number.isInteger(n) || n <= 0) {
      setSongError("Informe o número do cântico.");
      return;
    }
    const theme = songs.find((s) => s.number === n)?.theme ?? "";
    onStage({ songNumber: n, songTheme: theme });
    onClose();
  }

  function handleClassroomStage(value: "A" | "B" | "C") {
    setRoom(value);
    onStage({ classroom: value });
  }

  function handleCongregationStage() {
    onStage({ speakerCongregation: congregation.trim().slice(0, 160) });
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent className="max-h-[85dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="truncate">{title}</AlertDialogTitle>
        </AlertDialogHeader>
        {(currentPersonName || currentHelperName) && (
          <p className="text-sm text-muted-foreground">
            Atual: <span className="font-medium text-foreground">{currentPersonName}</span>
            {currentHelperName ? ` · ${currentHelperName}` : ""}
          </p>
        )}
        {isSong && (
          <div className="flex gap-2">
            <input
              value={songNumber}
              onChange={(e) => setSongNumber(e.target.value)}
              inputMode="numeric"
              placeholder="Nº do cântico"
              className="h-11 w-32 rounded-lg bg-secondary px-3 text-sm outline-none"
            />
            <button
              type="button"
              onClick={handleSongStage}
              className="h-11 rounded-full bg-accent px-5 font-display text-sm font-medium uppercase tracking-wider text-accent-ink"
            >
              Definir cântico
            </button>
          </div>
        )}
        {songError && (
          <p role="alert" className="text-sm text-danger">
            {songError}
          </p>
        )}
        {isMinistry && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sala:</span>
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
          <div className="flex gap-2">
            <input
              value={congregation}
              onChange={(e) => setCongregation(e.target.value)}
              placeholder="Congregação do orador"
              maxLength={160}
              className="h-11 flex-1 rounded-lg bg-secondary px-3 text-sm outline-none"
            />
            <button
              type="button"
              onClick={handleCongregationStage}
              className="h-11 rounded-full bg-accent px-5 font-display text-sm font-medium uppercase tracking-wider text-accent-ink"
            >
              Definir
            </button>
          </div>
        )}
        {!isSong && !allowPerson && (
          <p className="text-sm text-muted-foreground">Esta parte não tem designação.</p>
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
              maxLength={60}
              className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOrderBy("name")}
                className={`h-9 flex-1 rounded-full text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 ${orderBy === "name" ? "bg-accent text-accent-ink" : "bg-secondary text-muted-foreground"}`}
              >
                Ordem alfabética
              </button>
              <button
                type="button"
                onClick={() => setOrderBy("rotation")}
                className={`h-9 flex-1 rounded-full text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 ${orderBy === "rotation" ? "bg-accent text-accent-ink" : "bg-secondary text-muted-foreground"}`}
              >
                Rodízio (menos recentes)
              </button>
            </div>
            {titularQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : titularQuery.isError ? (
              <p role="alert" className="text-sm text-danger">
                Não foi possível carregar pessoas.
              </p>
            ) : (
              <>
                {titularQuery.isFetching && (
                  <p className="text-xs text-muted-foreground">Atualizando…</p>
                )}
                <ul className="flex flex-col gap-1">
                  {(titularQuery.data ?? []).map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => handlePickTitular(p)}
                        className="flex min-h-12 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-secondary"
                      >
                        <span className="flex-1">
                          {p.firstName} {p.lastName}
                          <span className="block text-xs text-muted-foreground">
                            {formatLastAssignment(p.lastAssignmentAt)}
                          </span>
                        </span>
                        <span aria-hidden className="shrink-0 text-muted-foreground">
                          ›
                        </span>
                      </button>
                    </li>
                  ))}
                  {(titularQuery.data ?? []).length === 0 && (
                    <li className="text-sm text-muted-foreground">Nenhuma pessoa encontrada.</li>
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
                className="h-9 shrink-0 rounded-full bg-background px-3 text-xs font-medium"
              >
                Trocar
              </button>
            </div>
            {helperRule && (
              <p className="text-xs text-muted-foreground">
                {helperRule === "sameSex"
                  ? `${labels.helper}: alguém do mesmo sexo que ${selectedTitular.firstName}.`
                  : `${labels.helper}: alguém do mesmo sexo ou da mesma família que ${selectedTitular.firstName}.`}
              </p>
            )}
            <input
              value={helperSearchInput}
              onChange={(e) => setHelperSearchInput(e.target.value)}
              placeholder={`Buscar ${labels.helper.toLowerCase()}…`}
              maxLength={60}
              className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none"
            />
            {helperQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : helperQuery.isError ? (
              <p role="alert" className="text-sm text-danger">
                Não foi possível carregar pessoas.
              </p>
            ) : (
              <>
                {helperQuery.isFetching && (
                  <p className="text-xs text-muted-foreground">Atualizando…</p>
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
                        className="flex min-h-12 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-secondary"
                      >
                        <span className="flex-1">
                          {h.firstName} {h.lastName}
                          <span className="block text-xs text-muted-foreground">
                            {formatLastAssignment(h.lastAssignmentAt)}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-accent">Escolher</span>
                      </button>
                    </li>
                  ))}
                  {eligibleHelpers.length === 0 && (
                    <li className="text-sm text-muted-foreground">
                      Nenhum {labels.helper.toLowerCase()} elegível para {selectedTitular.firstName}
                      .
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
              className="h-11 flex-1 rounded-lg bg-secondary px-3 text-sm font-medium"
            >
              ‹ Voltar
            </button>
          )}
          <AlertDialogCancel className="mt-0">Fechar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

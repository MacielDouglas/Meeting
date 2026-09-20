"use client";

import { useEffect, useState } from "react";
import {
  updateMeetingAssignment,
  updateMeetingAssignmentDetails,
  updateMeetingSong,
} from "@/features/meetings/application/meeting-actions";
import {
  listMeetingPersons,
  type MeetingPerson,
} from "@/features/meetings/application/meeting-person-queries";
import { capabilityField, helperCapabilityField } from "@/features/meetings/domain/capabilities";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

interface SongOption {
  number: number;
  theme: string;
}

interface MeetingAssignModalProps {
  assignmentId: string;
  title: string;
  capability?: string;
  needsHelper?: boolean;
  isSong?: boolean;
  partKey?: string;
  classroom?: string;
  speakerCongregation?: string;
  songs: SongOption[];
  currentPersonName: string;
  currentHelperName: string;
  onClose: () => void;
  onUpdated: () => void;
}

function formatLastAssignment(iso: string | null): string {
  if (!iso) return "sem histórico";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "sem histórico";
  return `última: ${date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" })}`;
}

export function MeetingAssignModal({
  assignmentId,
  title,
  capability,
  needsHelper,
  isSong,
  partKey,
  classroom,
  speakerCongregation,
  songs,
  currentPersonName,
  currentHelperName,
  onClose,
  onUpdated,
}: MeetingAssignModalProps) {
  const [persons, setPersons] = useState<MeetingPerson[]>([]);
  const [helpers, setHelpers] = useState<MeetingPerson[]>([]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [orderBy, setOrderBy] = useState<"name" | "rotation">("name");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [songNumber, setSongNumber] = useState("");
  const [congregation, setCongregation] = useState(speakerCongregation ?? "");
  const isMinistry = capability === "ministry" || partKey?.startsWith("ministry-") === true;
  const isPublicTalk = capability === "publicTalk";

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [main, help] = await Promise.all([
          listMeetingPersons(capabilityField(capability), {
            search: debounced || undefined,
            limit: 60,
            orderBy,
          }),
          needsHelper
            ? listMeetingPersons(helperCapabilityField(capability), {
                search: debounced || undefined,
                limit: 60,
                orderBy,
              })
            : Promise.resolve([] as MeetingPerson[]),
        ]);
        if (!cancelled) {
          setPersons(main);
          setHelpers(help);
        }
      } catch {
        if (!cancelled) setError("Não foi possível carregar pessoas.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [capability, needsHelper, debounced, orderBy]);

  async function handleSelect(personId: string, helperId?: string | null) {
    setSaving(true);
    setError(null);
    const result = await updateMeetingAssignment(assignmentId, personId, helperId);
    if (result.ok) {
      onUpdated();
      onClose();
    } else {
      setError(result.error ?? "Erro ao salvar.");
      setSaving(false);
    }
  }

  async function handleSongSave() {
    const n = Number(songNumber);
    if (!Number.isInteger(n) || n <= 0) {
      setError("Informe o número do cântico.");
      return;
    }
    const theme = songs.find((s) => s.number === n)?.theme ?? "";
    setSaving(true);
    const result = await updateMeetingSong(assignmentId, n, theme);
    if (result.ok) {
      onUpdated();
      onClose();
    } else {
      setError(result.error ?? "Erro ao salvar.");
      setSaving(false);
    }
  }

  async function handleClassroomSave(value: "A" | "B" | "C") {
    setSaving(true);
    setError(null);
    const result = await updateMeetingAssignmentDetails({ assignmentId, classroom: value });
    if (result.ok) {
      onUpdated();
    } else {
      setError(result.error ?? "Erro ao salvar.");
    }
    setSaving(false);
  }

  async function handleCongregationSave() {
    setSaving(true);
    setError(null);
    const result = await updateMeetingAssignmentDetails({
      assignmentId,
      speakerCongregation: congregation.trim().slice(0, 160),
    });
    if (result.ok) {
      onUpdated();
    } else {
      setError(result.error ?? "Erro ao salvar.");
    }
    setSaving(false);
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
              className="h-9 w-32 rounded-lg bg-secondary px-3 text-sm outline-none"
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSongSave()}
              className="h-9 rounded-lg bg-sky-500 px-3 text-sm text-white disabled:opacity-50"
            >
              Salvar cântico
            </button>
          </div>
        )}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar pessoa…"
          maxLength={60}
          className="h-9 rounded-lg bg-secondary px-3 text-sm outline-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOrderBy("name")}
            className={`h-8 flex-1 rounded-full text-xs font-medium ${orderBy === "name" ? "bg-sky-500 text-white" : "bg-secondary text-muted-foreground"}`}
          >
            Ordem alfabética
          </button>
          <button
            type="button"
            onClick={() => setOrderBy("rotation")}
            className={`h-8 flex-1 rounded-full text-xs font-medium ${orderBy === "rotation" ? "bg-sky-500 text-white" : "bg-secondary text-muted-foreground"}`}
          >
            Rodízio (menos recentes)
          </button>
        </div>
        {isMinistry && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sala:</span>
            {(["A", "B", "C"] as const).map((room) => (
              <button
                key={room}
                type="button"
                disabled={saving}
                onClick={() => void handleClassroomSave(room)}
                className={`h-8 w-10 rounded-lg text-xs font-semibold ${classroom === room ? "bg-sky-500 text-white" : "bg-secondary text-muted-foreground"}`}
              >
                {room}
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
              className="h-9 flex-1 rounded-lg bg-secondary px-3 text-sm outline-none"
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleCongregationSave()}
              className="h-9 rounded-lg bg-sky-500 px-3 text-sm text-white disabled:opacity-50"
            >
              Salvar
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {persons.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={saving || needsHelper}
                  onClick={() => void handleSelect(p.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span className="flex-1">
                    {p.firstName} {p.lastName}
                    <span className="block text-xs text-muted-foreground">
                      {formatLastAssignment(p.lastAssignmentAt)}
                    </span>
                  </span>
                  {!needsHelper && <span className="text-xs text-sky-600">Designar</span>}
                </button>
                {needsHelper && (
                  <div className="ml-4 flex flex-col gap-1 border-l pl-2">
                    <p className="text-xs text-muted-foreground">Ajudante para {p.firstName}:</p>
                    <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                      {helpers.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          disabled={saving}
                          onClick={() => void handleSelect(p.id, h.id)}
                          className="rounded px-2 py-1 text-left text-xs hover:bg-secondary"
                        >
                          {h.firstName} {h.lastName}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSelect(p.id, null)}
                      className="self-start text-xs text-sky-600"
                    >
                      Só {p.firstName} (sem ajudante)
                    </button>
                  </div>
                )}
              </li>
            ))}
            {persons.length === 0 && (
              <li className="text-sm text-muted-foreground">Nenhuma pessoa encontrada.</li>
            )}
          </ul>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Fechar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

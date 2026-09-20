"use client";

import { useEffect, useState } from "react";
import {
  updateMeetingAssignment,
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
  songs: SongOption[];
  currentPersonName: string;
  currentHelperName: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function MeetingAssignModal({
  assignmentId,
  title,
  capability,
  needsHelper,
  isSong,
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [songNumber, setSongNumber] = useState("");

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
          }),
          needsHelper
            ? listMeetingPersons(helperCapabilityField(capability), {
                search: debounced || undefined,
                limit: 60,
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
  }, [capability, needsHelper, debounced]);

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

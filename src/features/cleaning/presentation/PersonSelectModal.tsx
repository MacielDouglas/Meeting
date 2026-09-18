"use client";

import { useEffect, useState } from "react";
import { updateCleaningAssignment } from "@/features/cleaning/application/cleaning-program-actions";
import {
  type EligiblePerson,
  getPersonCleaningHistory,
  listEligiblePersons,
  type PersonCleaningHistory,
} from "@/features/cleaning/application/cleaning-program-queries";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { CleaningHistoryBadge } from "./CleaningHistoryBadge";

interface PersonSelectModalProps {
  assignmentId: string;
  sectorKey: string;
  sectorName: string;
  typeKey: string;
  currentPersonId: string | null;
  currentPersonName: string;
  requiredSex: "any" | "male" | "female";
  dayUsedPersonIds: string[];
  onClose: () => void;
  onUpdated: () => void;
}

export function PersonSelectModal({
  assignmentId,
  sectorKey,
  sectorName,
  typeKey,
  currentPersonId,
  currentPersonName,
  requiredSex,
  dayUsedPersonIds,
  onClose,
  onUpdated,
}: PersonSelectModalProps) {
  const [persons, setPersons] = useState<EligiblePerson[]>([]);
  const [histories, setHistories] = useState<Map<string, PersonCleaningHistory[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const eligible = await listEligiblePersons(requiredSex);
      if (cancelled) return;

      const historyMap = new Map<string, PersonCleaningHistory[]>();
      await Promise.all(
        eligible.map(async (p) => {
          const history = await getPersonCleaningHistory(p.id, 10);
          if (!cancelled) historyMap.set(p.id, history);
        }),
      );

      if (!cancelled) {
        setPersons(eligible);
        setHistories(historyMap);
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [requiredSex]);

  async function handleSelect(personId: string) {
    setSaving(true);
    setError(null);
    const result = await updateCleaningAssignment(assignmentId, personId);
    if (result.ok) {
      onUpdated();
      onClose();
    } else {
      setError(result.error ?? "Erro ao atualizar.");
      setSaving(false);
    }
  }

  const dayUsedSet = new Set(dayUsedPersonIds);

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent className="max-h-[85dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Designar para {sectorName}</AlertDialogTitle>
        </AlertDialogHeader>

        {currentPersonId && (
          <p className="text-sm text-muted-foreground">
            Atual: <span className="font-medium text-foreground">{currentPersonName}</span>
          </p>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando pessoas...</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {persons.map((person) => {
              const isUsed = dayUsedSet.has(person.id) && person.id !== currentPersonId;
              const history = histories.get(person.id) ?? [];
              return (
                <li key={person.id}>
                  <button
                    type="button"
                    disabled={isUsed || saving}
                    onClick={() => void handleSelect(person.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      person.id === currentPersonId
                        ? "bg-sky-500/10 ring-1 ring-sky-500"
                        : isUsed
                          ? "opacity-40"
                          : "hover:bg-secondary"
                    }`}
                  >
                    <span className="flex-1">
                      {person.firstName} {person.lastName}
                      {person.id === currentPersonId && (
                        <span className="ml-1 text-xs text-sky-500">(atual)</span>
                      )}
                      {isUsed && (
                        <span className="ml-1 text-xs text-red-500">(já designado hoje)</span>
                      )}
                    </span>
                    <CleaningHistoryBadge
                      history={history}
                      currentSectorKey={sectorKey}
                      typeKey={typeKey}
                    />
                  </button>
                </li>
              );
            })}
            {persons.length === 0 && (
              <li className="text-sm text-muted-foreground">Nenhuma pessoa elegível encontrada.</li>
            )}
          </ul>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

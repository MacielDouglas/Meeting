"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Switch } from "@/shared/components/ui/switch";
import { es } from "@/shared/i18n/es";

const STORAGE_KEY = "reunioes-edit-mode";
const EVENT_NAME = "reunioes-edit-mode-change";
const PROGRESS_EVENT = "reunioes-progress";

function readEditMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeEditMode(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  const onCustom = () => onChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT_NAME, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT_NAME, onCustom);
  };
}

/** Lê o modo edição (persistido em localStorage, sobrevive à troca de abas). */
export function useReunioesEditMode(): boolean {
  return useSyncExternalStore(subscribeEditMode, readEditMode, () => false);
}

export function setReunioesEditMode(checked: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, checked ? "1" : "0");
  } catch {
    /* armazenamento indisponível: segue só em memória da sessão */
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

/**
 * Ilha client mínima: switch no topo da página para owner/admin, no layout
 * das imagens (título + switch à direita, subtítulo e contador abaixo).
 * O server decide quem vê (canManage); o estado vive no client.
 * O contador "X/Y asignadas" chega via evento `reunioes-progress` emitido
 * pela seção do programa; só aparece com a edição ligada.
 */
export function ReunioesEditModeToggle() {
  const editMode = useReunioesEditMode();
  const [progress, setProgress] = useState<{ assigned: number; total: number } | null>(null);

  useEffect(() => {
    const onProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ assigned: number; total: number }>).detail;
      if (detail && typeof detail.assigned === "number" && typeof detail.total === "number") {
        setProgress({ assigned: detail.assigned, total: detail.total });
      }
    };
    window.addEventListener(PROGRESS_EVENT, onProgress);
    return () => window.removeEventListener(PROGRESS_EVENT, onProgress);
  }, []);

  return (
    <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground">{es.editarReunion}</span>
        <Switch label={es.editarReunion} checked={editMode} onCheckedChange={setReunioesEditMode} />
      </div>
      <p className="text-xs text-muted-foreground">{es.activaAsignarPartes}</p>
      {editMode && progress && progress.total > 0 && (
        <p className="text-xs font-semibold tabular-nums text-accent">
          {progress.assigned}/{progress.total} {es.asignadas}
        </p>
      )}
    </div>
  );
}
